package shared

type TripEvent struct {
	TripID string `json:"trip_id"`
	UserID string `json:"user_id"`
	Action string `json:"action"` // "created", "updated"
}

type TripEventListener interface {
	OnTripEvent(event TripEvent)
}
