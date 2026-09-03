package chat

import (
	"database/sql"
	"fmt"
	"time"

	"felag/backend/internal/shared"
)

type ConversationRecord struct {
	ID                 string
	MatchID            sql.NullString
	Participant1       string
	Participant2       string
	LastMessagePreview sql.NullString
	LastMessageAt      time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type Repository interface {
	ListConversations(userID string) ([]Conversation, error)
	GetConversationByID(conversationID string) (*ConversationRecord, error)
	GetConversationByParticipants(p1, p2 string) (*ConversationRecord, error)
	CreateConversation(matchID *string, p1, p2 string) (*ConversationRecord, error)
	GetConversationDetailed(conversationID, userID string) (*Conversation, error)
	CreateMessage(conversationID, senderID, encryptedContent, preview string) (*Message, error)
	ListMessages(conversationID string, limit int) ([]Message, error)
	MarkMessagesAsRead(conversationID, readerID string) (int64, error)
	GetUserName(userID string) (string, error)
	UserExists(userID string) (bool, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) UserExists(userID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`
	err := r.db.QueryRow(query, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("error checking if user exists: %w", err)
	}
	return exists, nil
}

func (r *repository) GetUserName(userID string) (string, error) {
	var name string
	err := r.db.QueryRow(`SELECT name FROM users WHERE id = $1`, userID).Scan(&name)
	if err != nil {
		return "", err
	}
	return name, nil
}

func (r *repository) ListConversations(userID string) ([]Conversation, error) {
	query := `
		SELECT c.id, c.match_id, c.last_message_preview, c.last_message_at, c.created_at,
		       other_u.id, other_u.name, other_u.avatar_url,
		       t.name, reg.name, ctry.name,
		       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read = FALSE) AS unread_count
		FROM conversations c
		JOIN users other_u ON other_u.id = (CASE WHEN c.participant_1 = $1 THEN c.participant_2 ELSE c.participant_1 END)
		LEFT JOIN towns t ON other_u.town_id = t.id
		LEFT JOIN regions reg ON t.region_id = reg.id
		LEFT JOIN countries ctry ON reg.country_id = ctry.id
		WHERE c.participant_1 = $1 OR c.participant_2 = $1
		ORDER BY c.last_message_at DESC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying conversations: %w", err)
	}
	defer rows.Close()

	var conversations []Conversation
	for rows.Next() {
		var conv Conversation
		var matchID, preview, avatar sql.NullString
		var townName, regionName, countryName sql.NullString

		err := rows.Scan(
			&conv.ID, &matchID, &preview, &conv.LastMessageAt, &conv.CreatedAt,
			&conv.OtherParticipant.ID, &conv.OtherParticipant.Name, &avatar,
			&townName, &regionName, &countryName,
			&conv.UnreadCount,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning conversation: %w", err)
		}

		if matchID.Valid {
			conv.MatchID = &matchID.String
		}
		if avatar.Valid {
			conv.OtherParticipant.AvatarURL = &avatar.String
		}

		if townName.Valid && regionName.Valid {
			summary := fmt.Sprintf("%s (%s)", townName.String, regionName.String)
			conv.OtherParticipant.OriginSummary = &summary
		} else if regionName.Valid && countryName.Valid {
			summary := fmt.Sprintf("%s (%s)", regionName.String, countryName.String)
			conv.OtherParticipant.OriginSummary = &summary
		} else if countryName.Valid {
			summary := countryName.String
			conv.OtherParticipant.OriginSummary = &summary
		}

		if preview.Valid {
			decrypted, err := shared.Decrypt(preview.String)
			if err == nil {
				conv.LastMessagePreview = &decrypted
			} else {
				// If not encrypted or fallback
				conv.LastMessagePreview = &preview.String
			}
		}

		conversations = append(conversations, conv)
	}

	if conversations == nil {
		conversations = []Conversation{}
	}

	return conversations, nil
}

func (r *repository) GetConversationByID(conversationID string) (*ConversationRecord, error) {
	query := `
		SELECT id, match_id, participant_1, participant_2, last_message_preview, last_message_at, created_at, updated_at
		FROM conversations
		WHERE id = $1
	`
	var rec ConversationRecord
	err := r.db.QueryRow(query, conversationID).Scan(
		&rec.ID, &rec.MatchID, &rec.Participant1, &rec.Participant2,
		&rec.LastMessagePreview, &rec.LastMessageAt, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying conversation by id: %w", err)
	}
	return &rec, nil
}

func (r *repository) GetConversationByParticipants(p1, p2 string) (*ConversationRecord, error) {
	query := `
		SELECT id, match_id, participant_1, participant_2, last_message_preview, last_message_at, created_at, updated_at
		FROM conversations
		WHERE (participant_1 = $1 AND participant_2 = $2)
		   OR (participant_1 = $2 AND participant_2 = $1)
	`
	var rec ConversationRecord
	err := r.db.QueryRow(query, p1, p2).Scan(
		&rec.ID, &rec.MatchID, &rec.Participant1, &rec.Participant2,
		&rec.LastMessagePreview, &rec.LastMessageAt, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying conversation by participants: %w", err)
	}
	return &rec, nil
}

func (r *repository) CreateConversation(matchID *string, p1, p2 string) (*ConversationRecord, error) {
	// Normalize order
	if p1 > p2 {
		p1, p2 = p2, p1
	}

	query := `
		INSERT INTO conversations (match_id, participant_1, participant_2, last_message_at, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW(), NOW())
		ON CONFLICT (participant_1, participant_2) DO UPDATE SET updated_at = NOW()
		RETURNING id, match_id, participant_1, participant_2, last_message_preview, last_message_at, created_at, updated_at
	`
	var rec ConversationRecord
	err := r.db.QueryRow(query, matchID, p1, p2).Scan(
		&rec.ID, &rec.MatchID, &rec.Participant1, &rec.Participant2,
		&rec.LastMessagePreview, &rec.LastMessageAt, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error inserting conversation: %w", err)
	}
	return &rec, nil
}

func (r *repository) GetConversationDetailed(conversationID, userID string) (*Conversation, error) {
	query := `
		SELECT c.id, c.match_id, c.last_message_preview, c.last_message_at, c.created_at,
		       other_u.id, other_u.name, other_u.avatar_url,
		       t.name, reg.name, ctry.name,
		       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $2 AND m.read = FALSE) AS unread_count
		FROM conversations c
		JOIN users other_u ON other_u.id = (CASE WHEN c.participant_1 = $2 THEN c.participant_2 ELSE c.participant_1 END)
		LEFT JOIN towns t ON other_u.town_id = t.id
		LEFT JOIN regions reg ON t.region_id = reg.id
		LEFT JOIN countries ctry ON reg.country_id = ctry.id
		WHERE c.id = $1 AND (c.participant_1 = $2 OR c.participant_2 = $2)
	`
	var conv Conversation
	var matchID, preview, avatar sql.NullString
	var townName, regionName, countryName sql.NullString

	err := r.db.QueryRow(query, conversationID, userID).Scan(
		&conv.ID, &matchID, &preview, &conv.LastMessageAt, &conv.CreatedAt,
		&conv.OtherParticipant.ID, &conv.OtherParticipant.Name, &avatar,
		&townName, &regionName, &countryName,
		&conv.UnreadCount,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying conversation detailed: %w", err)
	}

	if matchID.Valid {
		conv.MatchID = &matchID.String
	}
	if avatar.Valid {
		conv.OtherParticipant.AvatarURL = &avatar.String
	}

	if townName.Valid && regionName.Valid {
		summary := fmt.Sprintf("%s (%s)", townName.String, regionName.String)
		conv.OtherParticipant.OriginSummary = &summary
	} else if regionName.Valid && countryName.Valid {
		summary := fmt.Sprintf("%s (%s)", regionName.String, countryName.String)
		conv.OtherParticipant.OriginSummary = &summary
	} else if countryName.Valid {
		summary := countryName.String
		conv.OtherParticipant.OriginSummary = &summary
	}

	if preview.Valid {
		decrypted, err := shared.Decrypt(preview.String)
		if err == nil {
			conv.LastMessagePreview = &decrypted
		} else {
			conv.LastMessagePreview = &preview.String
		}
	}

	return &conv, nil
}

func (r *repository) CreateMessage(conversationID, senderID, encryptedContent, preview string) (*Message, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert message
	msgQuery := `
		INSERT INTO messages (conversation_id, sender_id, content, read, created_at)
		VALUES ($1, $2, $3, FALSE, NOW())
		RETURNING id, conversation_id, sender_id, content, read, created_at
	`
	var m Message
	var rawContent string
	err = tx.QueryRow(msgQuery, conversationID, senderID, encryptedContent).Scan(
		&m.ID, &m.ConversationID, &m.SenderID, &rawContent, &m.Read, &m.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error inserting message: %w", err)
	}

	// Encrypt preview for last_message_preview in conversation
	encryptedPreview, err := shared.Encrypt(preview)
	if err != nil {
		encryptedPreview = preview
	}

	// Update conversation
	convQuery := `
		UPDATE conversations
		SET last_message_preview = $2, last_message_at = $3, updated_at = NOW()
		WHERE id = $1
	`
	if _, err := tx.Exec(convQuery, conversationID, encryptedPreview, m.CreatedAt); err != nil {
		return nil, fmt.Errorf("error updating conversation last message: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("error committing message transaction: %w", err)
	}

	// Set decrypted content
	m.Content = preview
	return &m, nil
}

func (r *repository) ListMessages(conversationID string, limit int) ([]Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT id, conversation_id, sender_id, content, read, created_at
		FROM (
			SELECT id, conversation_id, sender_id, content, read, created_at
			FROM messages
			WHERE conversation_id = $1
			ORDER BY created_at DESC
			LIMIT $2
		) sub
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(query, conversationID, limit)
	if err != nil {
		return nil, fmt.Errorf("error querying messages: %w", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		var encryptedContent string
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &encryptedContent, &m.Read, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("error scanning message: %w", err)
		}

		decrypted, err := shared.Decrypt(encryptedContent)
		if err != nil {
			m.Content = encryptedContent
		} else {
			m.Content = decrypted
		}

		messages = append(messages, m)
	}

	if messages == nil {
		messages = []Message{}
	}

	return messages, nil
}

func (r *repository) MarkMessagesAsRead(conversationID, readerID string) (int64, error) {
	query := `
		UPDATE messages
		SET read = TRUE
		WHERE conversation_id = $1 AND sender_id != $2 AND read = FALSE
	`
	res, err := r.db.Exec(query, conversationID, readerID)
	if err != nil {
		return 0, fmt.Errorf("error marking messages as read: %w", err)
	}
	return res.RowsAffected()
}
