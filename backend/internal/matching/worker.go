package matching

import (
	"fmt"
	"log"

	"felag/backend/internal/notification"
	"felag/backend/internal/shared"
)

type Worker struct {
	matchingService     Service
	notificationService notification.Service
	eventsChan          chan shared.TripEvent
	stopChan            chan struct{}
}

func NewWorker(matchingService Service, notificationService notification.Service, bufferSize int) *Worker {
	if bufferSize <= 0 {
		bufferSize = 100
	}
	return &Worker{
		matchingService:     matchingService,
		notificationService: notificationService,
		eventsChan:          make(chan shared.TripEvent, bufferSize),
		stopChan:            make(chan struct{}),
	}
}

func (w *Worker) Start() {
	go func() {
		log.Println("[MatchingWorker] Worker asíncron de matching i notificacions iniciat.")
		for {
			select {
			case event := <-w.eventsChan:
				w.processTripEvent(event)
			case <-w.stopChan:
				log.Println("[MatchingWorker] Worker aturat.")
				return
			}
		}
	}()
}

func (w *Worker) Stop() {
	close(w.stopChan)
}

func (w *Worker) OnTripEvent(event shared.TripEvent) {
	w.PublishTripEvent(event)
}

func (w *Worker) PublishTripEvent(event shared.TripEvent) {
	select {
	case w.eventsChan <- event:
	default:
		log.Printf("[MatchingWorker] Alerta: cua d'esdeveniments plena, descartant viatge %s", event.TripID)
	}
}

func (w *Worker) processTripEvent(event shared.TripEvent) {
	log.Printf("[MatchingWorker] Processant matching per al viatge %s (acció: %s)...", event.TripID, event.Action)
	newMatches, err := w.matchingService.CalculateMatchesForTrip(event.TripID)
	if err != nil {
		log.Printf("[MatchingWorker] Error calculant matches per al viatge %s: %v", event.TripID, err)
		return
	}

	for _, m := range newMatches {
		title := fmt.Sprintf("✨ Nou FELAGI a %s!", m.DestinationName)
		body := fmt.Sprintf("%s (%s) coincidirà amb tu a %s del %s al %s.",
			m.MatchedUserName, m.MatchedUserOrigin, m.DestinationName, m.OverlapStartDate, m.OverlapEndDate)
		if m.MatchedUserOrigin == "" {
			body = fmt.Sprintf("%s coincidirà amb tu a %s del %s al %s.",
				m.MatchedUserName, m.DestinationName, m.OverlapStartDate, m.OverlapEndDate)
		}

		data := map[string]interface{}{
			"match_id":        m.MatchID,
			"trip_id":         m.TripID,
			"matched_trip_id": m.MatchedTripID,
			"matched_user_id": m.MatchedUserID,
		}

		if _, err := w.notificationService.SendNotification(m.UserID, "new_match", title, body, data); err != nil {
			log.Printf("[MatchingWorker] Error enviant notificació a usuari %s: %v", m.UserID, err)
		}
	}
}
