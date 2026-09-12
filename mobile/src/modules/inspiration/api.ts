import { apiClient } from '@/api/client';
import { communityApi } from '@/modules/community/api';
import {
  GetInspirationParams,
  InspirationCategory,
  InspirationCategoryOption,
  InspirationItem,
  InspirationResponse,
} from './types';

export const INSPIRATION_CATEGORIES: InspirationCategoryOption[] = [
  { id: 'all', label: 'Tot', emoji: '✨' },
  { id: 'itinerary', label: 'Itineraris', emoji: '🗺️' },
  { id: 'food', label: 'Gastronomia', emoji: '🍽️' },
  { id: 'hidden_gem', label: 'Racons Secrets', emoji: '💎' },
  { id: 'practical_tip', label: 'Consells', emoji: '💡' },
  { id: 'transport', label: 'Transport', emoji: '🚆' },
  { id: 'anecdote', label: 'Anècdotes', emoji: '📖' },
];

export const inspirationApi = {
  getInspirationFeed: async (params: GetInspirationParams = {}): Promise<InspirationResponse> => {
    try {
      const res = await apiClient.get<InspirationResponse>('/api/v1/inspiration', {
        params,
      });
      if (res.data && Array.isArray(res.data.items)) {
        return {
          items: res.data.items,
          total: res.data.total ?? res.data.items.length,
          categories: res.data.categories ?? INSPIRATION_CATEGORIES,
        };
      }
    } catch {
      // Fallback: aggregate from community API if endpoint fails or network is offline
    }

    return await aggregateInspirationFallback(params);
  },

  voteRecommendation: async (
    recommendationId: string
  ): Promise<{ voted: boolean; useful_votes_count: number }> => {
    const res = await communityApi.toggleVote(recommendationId);
    return {
      voted: res.voted,
      useful_votes_count: res.useful_votes_count,
    };
  },
};

export const getInspirationFeed = inspirationApi.getInspirationFeed;

/**
 * Fallback aggregator that merges community destinations, public trips,
 * and curated recommendations so that the inspiration feed is always functional.
 */
async function aggregateInspirationFallback(
  params: GetInspirationParams
): Promise<InspirationResponse> {
  const items: InspirationItem[] = [];

  try {
    const destinations = await communityApi.searchDestinations(params.q);
    const destSlice = destinations.slice(0, 10);

    const results = await Promise.allSettled(
      destSlice.map(async (dest) => {
        const [trips, recs] = await Promise.allSettled([
          communityApi.getDestinationPublicTrips(dest.id),
          communityApi.getRecommendations(dest.id, {
            category:
              params.category && params.category !== 'all' && params.category !== 'itinerary'
                ? params.category
                : undefined,
          }),
        ]);

        const destTrips = trips.status === 'fulfilled' ? trips.value : [];
        const destRecs = recs.status === 'fulfilled' ? recs.value : [];

        return { dest, trips: destTrips, recs: destRecs };
      })
    );

    for (const res of results) {
      if (res.status !== 'fulfilled') continue;
      const { dest, trips, recs } = res.value;

      // Add itineraries
      if (!params.category || params.category === 'all' || params.category === 'itinerary') {
        for (const trip of trips) {
          const startDate = trip.start_date ? new Date(trip.start_date) : null;
          const endDate = trip.end_date ? new Date(trip.end_date) : null;
          let totalDays = trip.total_days || 7;
          if (startDate && endDate) {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }

          const stages = (trip.stages || []).map((s, idx) => ({
            id: s.id,
            destination_name: s.destination_name || dest.name,
            town_name: s.town_id || undefined,
            country_name: dest.country_name || undefined,
            flag_emoji: dest.flag_emoji || undefined,
            order_index: idx + 1,
            arrival_date: s.start_date,
            departure_date: s.end_date,
          }));

          const coverPhoto =
            trip.photos?.find((p) => p.is_featured)?.image_url ||
            trip.photos?.[0]?.image_url ||
            dest.banner_url;

          items.push({
            id: `trip-${trip.id}`,
            type: 'itinerary',
            title: trip.title,
            description: trip.description || `Ruta de viatge de ${totalDays} dies per ${dest.name}.`,
            cover_image_url: coverPhoto,
            image_url: coverPhoto,
            flag_emoji: dest.flag_emoji || '✈️',
            country_name: dest.country_name || undefined,
            country_code: dest.country_code || undefined,
            destination_id: dest.id,
            destination_name: dest.name,
            total_days: totalDays,
            stages: stages.length > 0 ? stages : [{ destination_name: dest.name, order_index: 1 }],
            author: {
              id: trip.author.id,
              name: trip.author.anonymous_title || 'Viatger Felagi',
              town_name: trip.author.town_name || undefined,
              region_name: trip.author.region_name || undefined,
              country_name: trip.author.country_name || undefined,
              is_anonymous: true,
            },
            created_at: trip.start_date || new Date().toISOString(),
          });
        }
      }

      // Add recommendations
      for (const rec of recs) {
        if (params.category && params.category !== 'all' && rec.category !== params.category) {
          continue;
        }

        items.push({
          id: `rec-${rec.id}`,
          type: 'recommendation',
          title: rec.title,
          description: rec.description,
          category: rec.category as InspirationCategory,
          image_url: rec.image_url || dest.banner_url,
          cover_image_url: rec.image_url || dest.banner_url,
          location_name: rec.location_name || dest.name,
          destination_id: dest.id,
          destination_name: dest.name,
          flag_emoji: dest.flag_emoji || '📍',
          country_name: dest.country_name || undefined,
          country_code: dest.country_code || undefined,
          useful_votes_count: rec.useful_votes_count || 0,
          user_has_voted: rec.user_has_voted || false,
          comments_count: rec.comments_count || 0,
          author: {
            id: rec.author.id,
            name: rec.author.name,
            town_name: rec.author.town_name || undefined,
            region_name: rec.author.region_name || undefined,
            country_name: rec.author.country_name || undefined,
            avatar_url: rec.author.avatar_url || undefined,
          },
          created_at: rec.created_at,
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching fallback inspiration items:', err);
  }

  // If no items were found, provide curated inspiration items
  if (items.length === 0) {
    items.push(...getCuratedSeedItems());
  }

  let filtered = items;
  if (params.q && params.q.trim()) {
    const qLower = params.q.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(qLower) ||
        (item.description && item.description.toLowerCase().includes(qLower)) ||
        (item.destination_name && item.destination_name.toLowerCase().includes(qLower)) ||
        (item.country_name && item.country_name.toLowerCase().includes(qLower)) ||
        (item.location_name && item.location_name.toLowerCase().includes(qLower)) ||
        (item.stages && item.stages.some((s) => s.destination_name.toLowerCase().includes(qLower)))
    );
  }

  if (params.category && params.category !== 'all') {
    if (params.category === 'itinerary') {
      filtered = filtered.filter((item) => item.type === 'itinerary');
    } else {
      filtered = filtered.filter(
        (item) => item.type === 'recommendation' && item.category === params.category
      );
    }
  }

  const offset = params.offset || 0;
  const limit = params.limit || 20;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    items: paginated,
    total: filtered.length,
    categories: INSPIRATION_CATEGORIES,
  };
}

function getCuratedSeedItems(): InspirationItem[] {
  return [
    {
      id: 'seed-itinerary-japan',
      type: 'itinerary',
      title: 'Ruta clàssica de 14 dies pel Japó en Shinkansen',
      description:
        'Una immersió completa des del bullici tecnològic de Tòquio fins a la pau dels temples de Kyoto i la gastronomia urbana d’Osaka.',
      cover_image_url:
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&auto=format&fit=crop&q=80',
      flag_emoji: '🇯🇵',
      country_name: 'Japó',
      country_code: 'JP',
      destination_name: 'Tòquio & Kansai',
      total_days: 14,
      stages: [
        { destination_name: 'Tòquio', order_index: 1 },
        { destination_name: 'Hakone / Mt. Fuji', order_index: 2 },
        { destination_name: 'Kyoto', order_index: 3 },
        { destination_name: 'Nara', order_index: 4 },
        { destination_name: 'Osaka', order_index: 5 },
      ],
      author: {
        id: 'author-girona-1',
        name: 'Viatger Felagi',
        town_name: 'Girona',
        region_name: 'Gironès',
        country_name: 'Catalunya',
        is_anonymous: true,
      },
      useful_votes_count: 24,
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    },
    {
      id: 'seed-rec-ramen',
      type: 'recommendation',
      category: 'food',
      title: 'Tsukemen artesanal a Fuunji (Shinjuku)',
      description:
        'El millor brou concentrat de peix i porc que tastareu mai. Arribeu 15 minuts abans d’obrir per evitar cues llargues.',
      image_url:
        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
      location_name: 'Shinjuku, Tòquio',
      destination_name: 'Tòquio',
      flag_emoji: '🇯🇵',
      country_name: 'Japó',
      country_code: 'JP',
      useful_votes_count: 38,
      user_has_voted: false,
      author: {
        id: 'author-bcn-1',
        name: 'Oriol M.',
        town_name: 'Barcelona',
        region_name: 'Barcelonès',
      },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'seed-itinerary-iceland',
      type: 'itinerary',
      title: 'Volta a la Ring Road d’Islàndia en campervan',
      description:
        'Cascades infinites, platges de sorra negra, glaceres mil·lenàries i banys termals naturals completament solitaris.',
      cover_image_url:
        'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=900&auto=format&fit=crop&q=80',
      flag_emoji: '🇮🇸',
      country_name: 'Islàndia',
      country_code: 'IS',
      destination_name: 'Ring Road',
      total_days: 10,
      stages: [
        { destination_name: 'Reykjavík', order_index: 1 },
        { destination_name: 'Vík í Mýrdal', order_index: 2 },
        { destination_name: 'Höfn & Jökulsárlón', order_index: 3 },
        { destination_name: 'Mývatn & Akureyri', order_index: 4 },
        { destination_name: 'Snæfellsnes', order_index: 5 },
      ],
      author: {
        id: 'author-vic-1',
        name: 'Viatger Felagi',
        town_name: 'Vic',
        region_name: 'Osona',
        country_name: 'Catalunya',
        is_anonymous: true,
      },
      useful_votes_count: 19,
      created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    },
    {
      id: 'seed-rec-gem',
      type: 'recommendation',
      category: 'hidden_gem',
      title: 'Piscina termal amagada de Seljavallalaug',
      description:
        'Construïda el 1923 enmig d’una vall verda volcànica. Cal caminar 20 minuts pel riu; porteu roba d’abric per al canviador.',
      image_url:
        'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&auto=format&fit=crop&q=80',
      location_name: 'Sud d’Islàndia',
      destination_name: 'Islàndia',
      flag_emoji: '🇮🇸',
      country_name: 'Islàndia',
      country_code: 'IS',
      useful_votes_count: 29,
      user_has_voted: true,
      author: {
        id: 'author-manresa-1',
        name: 'Clara S.',
        town_name: 'Manresa',
        region_name: 'Bages',
      },
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    },
    {
      id: 'seed-rec-tip',
      type: 'recommendation',
      category: 'practical_tip',
      title: 'Targeta Suica digital a Apple / Google Wallet',
      description:
        'No feu cues a l’aeroport per comprar la targeta física de transport; afegiu la Suica directament al mòbil i recarregueu a l’instant.',
      image_url:
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
      location_name: 'Xarxa de metro i trens',
      destination_name: 'Tòquio',
      flag_emoji: '🇯🇵',
      country_name: 'Japó',
      country_code: 'JP',
      useful_votes_count: 42,
      user_has_voted: false,
      author: {
        id: 'author-lleida-1',
        name: 'Pau R.',
        town_name: 'Lleida',
        region_name: 'Segrià',
      },
      created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    },
    {
      id: 'seed-rec-transport',
      type: 'recommendation',
      category: 'transport',
      title: 'Tren panoràmic Bernina Express als Alps Suïssos',
      description:
        'Reserveu el vagó panoràmic al matí per gaudir de la llum sobre els glaciars i el viaducte de Landwasser sense reflexos.',
      image_url:
        'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&auto=format&fit=crop&q=80',
      location_name: 'Chur a Tirano',
      destination_name: 'Suïssa',
      flag_emoji: '🇨🇭',
      country_name: 'Suïssa',
      country_code: 'CH',
      useful_votes_count: 31,
      user_has_voted: false,
      author: {
        id: 'author-tarragona-1',
        name: 'Marta B.',
        town_name: 'Tarragona',
        region_name: 'Tarragonès',
      },
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    },
  ];
}
