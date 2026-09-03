package moderation

import (
	"errors"
	"testing"
	"time"
)

type mockModerationRepo struct {
	users        map[string]bool
	blocks       map[string]map[string]bool
	blockedUsers map[string][]BlockedUser
	reports      []struct {
		reporterID string
		reportedID string
		reason     string
		details    string
	}
}

func newMockModerationRepo() *mockModerationRepo {
	return &mockModerationRepo{
		users:        map[string]bool{"u1": true, "u2": true, "u3": true},
		blocks:       make(map[string]map[string]bool),
		blockedUsers: make(map[string][]BlockedUser),
	}
}

func (m *mockModerationRepo) UserExists(userID string) (bool, error) {
	return m.users[userID], nil
}

func (m *mockModerationRepo) BlockUser(blockerID, blockedID string) error {
	if m.blocks[blockerID] == nil {
		m.blocks[blockerID] = make(map[string]bool)
	}
	m.blocks[blockerID][blockedID] = true
	m.blockedUsers[blockerID] = append(m.blockedUsers[blockerID], BlockedUser{
		ID:        "block-id",
		UserID:    blockedID,
		Name:      "User " + blockedID,
		BlockedAt: time.Now(),
	})
	return nil
}

func (m *mockModerationRepo) UnblockUser(blockerID, blockedID string) error {
	if m.blocks[blockerID] != nil {
		delete(m.blocks[blockerID], blockedID)
	}
	var updated []BlockedUser
	for _, bu := range m.blockedUsers[blockerID] {
		if bu.UserID != blockedID {
			updated = append(updated, bu)
		}
	}
	m.blockedUsers[blockerID] = updated
	return nil
}

func (m *mockModerationRepo) ListBlockedUsers(blockerID string) ([]BlockedUser, error) {
	return m.blockedUsers[blockerID], nil
}

func (m *mockModerationRepo) IsBlocked(userA, userB string) (bool, error) {
	if m.blocks[userA] != nil && m.blocks[userA][userB] {
		return true, nil
	}
	if m.blocks[userB] != nil && m.blocks[userB][userA] {
		return true, nil
	}
	return false, nil
}

func (m *mockModerationRepo) CreateReport(reporterID, reportedID, reason, details string) error {
	m.reports = append(m.reports, struct {
		reporterID string
		reportedID string
		reason     string
		details    string
	}{reporterID, reportedID, reason, details})
	return nil
}

func TestModerationService_BlockAndIsBlocked(t *testing.T) {
	repo := newMockModerationRepo()
	svc := NewService(repo)

	// Test self block
	if err := svc.BlockUser("u1", "u1"); !errors.Is(err, ErrSelfBlock) {
		t.Fatalf("expected ErrSelfBlock, got %v", err)
	}

	// Test non existent user
	if err := svc.BlockUser("u1", "nonexistent"); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("expected ErrUserNotFound, got %v", err)
	}

	// Block u2
	if err := svc.BlockUser("u1", "u2"); err != nil {
		t.Fatalf("unexpected error blocking user: %v", err)
	}

	// Check IsBlocked both ways
	blocked, err := svc.IsBlocked("u1", "u2")
	if err != nil || !blocked {
		t.Fatalf("expected u1->u2 blocked to be true")
	}

	blockedReverse, err := svc.IsBlocked("u2", "u1")
	if err != nil || !blockedReverse {
		t.Fatalf("expected u2->u1 blocked to be true")
	}

	// Check ListBlockedUsers
	list, err := svc.ListBlockedUsers("u1")
	if err != nil || len(list) != 1 || list[0].UserID != "u2" {
		t.Fatalf("unexpected list of blocked users: %+v", list)
	}

	// Unblock u2
	if err := svc.UnblockUser("u1", "u2"); err != nil {
		t.Fatalf("unexpected error unblocking: %v", err)
	}

	blockedAfter, _ := svc.IsBlocked("u1", "u2")
	if blockedAfter {
		t.Fatalf("expected blockedAfter to be false")
	}
}

func TestModerationService_ReportUser(t *testing.T) {
	repo := newMockModerationRepo()
	svc := NewService(repo)

	// Self report
	err := svc.ReportUser("u1", "u1", ReportUserRequest{Reason: "spam", Details: "spamming me"})
	if !errors.Is(err, ErrSelfReport) {
		t.Fatalf("expected ErrSelfReport, got %v", err)
	}

	// Invalid reason
	err = svc.ReportUser("u1", "u2", ReportUserRequest{Reason: "unknown_reason", Details: "spamming me"})
	if !errors.Is(err, ErrInvalidReportReason) {
		t.Fatalf("expected ErrInvalidReportReason, got %v", err)
	}

	// Short details
	err = svc.ReportUser("u1", "u2", ReportUserRequest{Reason: "spam", Details: "bad"})
	if !errors.Is(err, ErrInvalidDetails) {
		t.Fatalf("expected ErrInvalidDetails, got %v", err)
	}

	// Valid report
	err = svc.ReportUser("u1", "u2", ReportUserRequest{Reason: "spam", Details: "This user sends repeated spam messages"})
	if err != nil {
		t.Fatalf("unexpected error reporting user: %v", err)
	}
	if len(repo.reports) != 1 {
		t.Fatalf("expected 1 report in repo, got %d", len(repo.reports))
	}
}
