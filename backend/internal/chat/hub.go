package chat

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 65536
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev/mobile/web
	},
}

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan WSOutgoingMessage
	userID   string
	chatSvc  Service
	isClosed bool
	mu       sync.Mutex
}

type Hub struct {
	clients    map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	h := &Hub{
		clients:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	go h.run()
	return h
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.userID] == nil {
				h.clients[client.userID] = make(map[*Client]bool)
			}
			h.clients[client.userID][client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if conns, ok := h.clients[client.userID]; ok {
				if _, exists := conns[client]; exists {
					delete(conns, client)
					client.closeSend()
					if len(conns) == 0 {
						delete(h.clients, client.userID)
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) IsUserOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	conns, ok := h.clients[userID]
	return ok && len(conns) > 0
}

func (h *Hub) SendToUser(userID string, msg WSOutgoingMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if conns, ok := h.clients[userID]; ok {
		for client := range conns {
			select {
			case client.send <- msg:
			default:
				// buffer full, avoid blocking
			}
		}
	}
}

func (c *Client) closeSend() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.isClosed {
		c.isClosed = true
		close(c.send)
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, payload, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WebSocket] unexpected close error: %v", err)
			}
			break
		}

		var incoming WSIncomingMessage
		if err := json.Unmarshal(payload, &incoming); err != nil {
			errStr := "Invalid message format"
			c.send <- WSOutgoingMessage{Type: "error", Error: &errStr}
			continue
		}

		switch incoming.Action {
		case "ping":
			c.send <- WSOutgoingMessage{Type: "pong"}

		case "send_message":
			if incoming.ConversationID == nil || incoming.Content == nil || *incoming.Content == "" {
				errStr := "conversation_id and non-empty content required"
				c.send <- WSOutgoingMessage{Type: "error", Error: &errStr}
				continue
			}

			msg, err := c.chatSvc.SendMessage(c.userID, *incoming.ConversationID, SendMessageRequest{Content: *incoming.Content})
			if err != nil {
				errStr := err.Error()
				c.send <- WSOutgoingMessage{Type: "error", Error: &errStr}
			} else {
				// Echo to current client if not already broadcasted
				_ = msg
			}

		case "mark_read":
			if incoming.ConversationID != nil {
				_ = c.chatSvc.MarkConversationAsRead(c.userID, *incoming.ConversationID)
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			payload, _ := json.Marshal(message)
			_, _ = w.Write(payload)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
