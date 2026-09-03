package moderation

import (
	"errors"
	"strings"
)

var (
	ErrSelfBlock           = errors.New("cannot block yourself")
	ErrSelfReport          = errors.New("cannot report yourself")
	ErrUserNotFound        = errors.New("user not found")
	ErrInvalidReportReason = errors.New("invalid report reason")
	ErrInvalidDetails      = errors.New("details must be at least 5 characters")
)

var validReasons = map[string]bool{
	"spam":                  true,
	"harassment":            true,
	"inappropriate_content": true,
	"safety_concern":        true,
	"other":                 true,
}

type Service interface {
	BlockUser(blockerID, blockedID string) error
	UnblockUser(blockerID, blockedID string) error
	ListBlockedUsers(blockerID string) ([]BlockedUser, error)
	IsBlocked(userA, userB string) (bool, error)
	ReportUser(reporterID, reportedID string, req ReportUserRequest) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) BlockUser(blockerID, blockedID string) error {
	if blockerID == blockedID {
		return ErrSelfBlock
	}

	exists, err := s.repo.UserExists(blockedID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrUserNotFound
	}

	return s.repo.BlockUser(blockerID, blockedID)
}

func (s *service) UnblockUser(blockerID, blockedID string) error {
	if blockerID == blockedID {
		return ErrSelfBlock
	}
	return s.repo.UnblockUser(blockerID, blockedID)
}

func (s *service) ListBlockedUsers(blockerID string) ([]BlockedUser, error) {
	users, err := s.repo.ListBlockedUsers(blockerID)
	if err != nil {
		return nil, err
	}
	if users == nil {
		users = []BlockedUser{}
	}
	return users, nil
}

func (s *service) IsBlocked(userA, userB string) (bool, error) {
	if userA == "" || userB == "" || userA == userB {
		return false, nil
	}
	return s.repo.IsBlocked(userA, userB)
}

func (s *service) ReportUser(reporterID, reportedID string, req ReportUserRequest) error {
	if reporterID == reportedID {
		return ErrSelfReport
	}

	reason := strings.TrimSpace(req.Reason)
	if !validReasons[reason] {
		return ErrInvalidReportReason
	}

	details := strings.TrimSpace(req.Details)
	if len(details) < 5 {
		return ErrInvalidDetails
	}

	exists, err := s.repo.UserExists(reportedID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrUserNotFound
	}

	return s.repo.CreateReport(reporterID, reportedID, reason, details)
}
