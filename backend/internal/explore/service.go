package explore

type Service interface {
	GetRecommendations(userID string) ([]ExploreDestinationItem, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{
		repo: repo,
	}
}

func (s *service) GetRecommendations(userID string) ([]ExploreDestinationItem, error) {
	origin, err := s.repo.GetUserOrigin(userID)
	if err != nil {
		return nil, err
	}

	return s.repo.GetExploreDestinations(origin, 20)
}
