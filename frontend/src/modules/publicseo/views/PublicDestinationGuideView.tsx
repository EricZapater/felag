import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Tab,
  Tabs,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Link,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { publicSeoApi } from '../api';
import { PublicAnonymousTip, PublicDestinationGuide } from '../types';

export default function PublicDestinationGuideView() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = searchParams.get('lang') || 'ca';

  const [guide, setGuide] = useState<PublicDestinationGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    publicSeoApi
      .getPublicDestinationGuide(slug, lang)
      .then((data) => {
        setGuide(data);
        // Inject SEO metadata to document head
        if (data.seo) {
          document.title = data.seo.meta_title || `${data.destination.name} — FELAG`;

          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', data.seo.meta_description || '');

          // Structured Data JSON-LD
          let jsonLdScript = document.getElementById('felag-jsonld-seo');
          if (!jsonLdScript) {
            jsonLdScript = document.createElement('script');
            jsonLdScript.id = 'felag-jsonld-seo';
            jsonLdScript.setAttribute('type', 'application/ld+json');
            document.head.appendChild(jsonLdScript);
          }
          jsonLdScript.textContent = JSON.stringify(data.seo.json_ld || {});
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'No s’ha pogut carregar la guia d’aquesta destinació.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, lang]);

  const handleLangChange = (newLang: string) => {
    setSearchParams({ lang: newLang });
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
        <AppHeader />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress sx={{ color: '#C85A32' }} />
        </Box>
      </Box>
    );
  }

  if (error || !guide) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
        <AppHeader />
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Button
            component={RouterLink}
            to="/destinacions"
            startIcon={<ArrowBackIcon />}
            sx={{ color: '#C85A32', mb: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Totes les destinacions
          </Button>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {error || 'Destinació no trobada o sense contingut públic disponible.'}
          </Alert>
        </Container>
      </Box>
    );
  }

  const { destination, stats, categories, faqs, related_destinations: related } = guide;

  const categoryLists: { key: string; label: string; icon: string; tips: PublicAnonymousTip[] }[] = [
    { key: 'all', label: 'Tots els consells', icon: '🌟', tips: [
      ...categories.food,
      ...categories.hidden_gem,
      ...categories.transport,
      ...categories.practical_tip,
      ...categories.anecdote,
    ]},
    { key: 'food', label: 'Gastronomia', icon: '🍽️', tips: categories.food },
    { key: 'hidden_gem', label: 'Racons Secrets', icon: '💎', tips: categories.hidden_gem },
    { key: 'transport', label: 'Mobilitat & Transport', icon: '🚆', tips: categories.transport },
    { key: 'practical_tip', label: 'Consells Pràctics', icon: '💡', tips: categories.practical_tip },
    { key: 'anecdote', label: 'Curiositats & Històries', icon: '📖', tips: categories.anecdote },
  ];

  const currentCategory = categoryLists[activeTab] || categoryLists[0];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F6F0' }}>
      <AppHeader />

      {/* Hero Banner with Brand Styling */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2C221E 0%, #4A3B32 100%)',
          color: '#FFFFFF',
          pt: 4,
          pb: 6,
          px: 2,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Container maxWidth="lg">
          {/* Breadcrumbs and Language Switcher */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
              mb: 3,
            }}
          >
            <Breadcrumbs sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              <Link component={RouterLink} to="/" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                FELAG
              </Link>
              <Link component={RouterLink} to="/destinacions" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                Destinacions
              </Link>
              <Typography sx={{ color: '#FFE082', fontWeight: 600, fontSize: '0.85rem' }}>
                {destination.name}
              </Typography>
            </Breadcrumbs>

            {/* Language Switcher */}
            <Box sx={{ display: 'flex', gap: 1, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2, p: 0.5 }}>
              {(['ca', 'es', 'en'] as const).map((l) => (
                <Button
                  key={l}
                  size="small"
                  onClick={() => handleLangChange(l)}
                  sx={{
                    minWidth: 36,
                    py: 0.2,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: lang === l ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                    bgcolor: lang === l ? '#C85A32' : 'transparent',
                    borderRadius: 1.5,
                    '&:hover': { bgcolor: lang === l ? '#A0471D' : 'rgba(255,255,255,0.2)' },
                  }}
                >
                  {l}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Main Title & Trust Proof */}
          <Box sx={{ maxWidth: 800 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<VerifiedIcon sx={{ color: '#FFFFFF !important', fontSize: 16 }} />}
                label="Guia Comunitària FELAG"
                size="small"
                sx={{
                  bgcolor: 'rgba(200,90,50,0.95)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                📍 {destination.region_name ? `${destination.region_name}, ` : ''}{destination.country_name}
              </Typography>
            </Box>

            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '2.85rem' },
                color: '#FFFFFF',
                letterSpacing: -0.5,
                mb: 1.5,
              }}
            >
              {destination.name} {destination.flag_emoji}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: { xs: '1rem', md: '1.15rem' },
                lineHeight: 1.6,
                mb: 3,
              }}
            >
              Consells pràctics, gastronomia i racons secrets compartits pels viatgers de la comunitat FELAG. Informació 100% autèntica i consolidada.
            </Typography>

            {/* Aggregated Stats Pills */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Chip
                label={`✨ ${destination.endorsement_summary}`}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                }}
              />
              <Chip
                label={`📝 ${stats.total_tips} recomanacions públiques`}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              />
              <Chip
                label={`📅 Actualitzat: ${destination.updated_at_period}`}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: '#FFE082',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Category Tabs */}
        <Box sx={{ borderBottom: '1px solid #E8E2D9', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': { bgcolor: '#C85A32', height: 3, borderRadius: 1.5 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#786C65',
                '&.Mui-selected': { color: '#C85A32' },
              },
            }}
          >
            {categoryLists.map((cat, idx) => (
              <Tab
                key={cat.key}
                label={`${cat.icon} ${cat.label} (${cat.tips.length})`}
                id={`cat-tab-${idx}`}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tips Grid */}
        {currentCategory.tips.length === 0 ? (
          <Card
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed #DDCFBF',
              bgcolor: '#FAF7F2',
              my: 4,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2C221E', mb: 1 }}>
              Encara no hi ha consells en aquesta categoria
            </Typography>
            <Typography variant="body2" sx={{ color: '#786C65', maxWidth: 450, mx: 'auto' }}>
              Els viatgers de FELAG afegeixen noves recomanacions contínuament.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {currentCategory.tips.map((tip) => (
              <Grid item xs={12} sm={6} md={4} key={tip.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    border: '1px solid #E8E2D9',
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(74,46,43,0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 20px rgba(74,46,43,0.08)',
                    },
                  }}
                >
                  {tip.photo_url && (
                    <CardMedia
                      component="img"
                      height="180"
                      image={tip.photo_url}
                      alt={tip.title}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Category & Period Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Chip
                        label={getCategoryName(tip.category)}
                        size="small"
                        sx={{
                          bgcolor: getCategoryBg(tip.category),
                          color: getCategoryColor(tip.category),
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          borderRadius: 1.5,
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#8C7A70' }}>
                        <CalendarMonthIcon sx={{ fontSize: 15 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {tip.period}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        color: '#2C221E',
                        lineHeight: 1.3,
                        mb: 1,
                      }}
                    >
                      {tip.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#5C504A',
                        lineHeight: 1.55,
                        mb: 2,
                        flexGrow: 1,
                      }}
                    >
                      {tip.description}
                    </Typography>

                    {/* Location hint if provided */}
                    {tip.location_hint && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, color: '#786C65' }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: '#C85A32' }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {tip.location_hint}
                        </Typography>
                      </Box>
                    )}

                    {/* Social Endorsement Bar */}
                    <Box
                      sx={{
                        pt: 1.5,
                        borderTop: '1px solid #F0ECE4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <AutoAwesomeIcon sx={{ fontSize: 16, color: '#C85A32' }} />
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: '#C85A32', fontSize: '0.78rem' }}
                        >
                          {tip.endorsement_label}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* FAQ Section for SEO Rich Snippets */}
        {faqs.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', mb: 2 }}>
              ❓ Preguntes Freqüents sobre {destination.name}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {faqs.map((faq, index) => (
                <Accordion
                  key={index}
                  sx={{
                    borderRadius: '12px !important',
                    border: '1px solid #E8E2D9',
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#C85A32' }} />}>
                    <Typography sx={{ fontWeight: 700, color: '#2C221E', fontSize: '0.98rem' }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#5C504A', lineHeight: 1.6, mb: 1 }}>
                      {faq.answer}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#C85A32', fontWeight: 600 }}>
                      ✨ {faq.endorsement_label}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>
        )}

        {/* Related Destinations */}
        {related.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2C221E', mb: 2 }}>
              🧭 Altres destinacions recomanades a {destination.country_name}
            </Typography>
            <Grid container spacing={2}>
              {related.map((rel) => (
                <Grid item xs={6} sm={3} key={rel.id}>
                  <Card
                    component={RouterLink}
                    to={`/destinacions/${rel.slug}`}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      borderRadius: 3,
                      border: '1px solid #E8E2D9',
                      textDecoration: 'none',
                      bgcolor: '#FFFFFF',
                      display: 'block',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2C221E' }}>
                      {rel.name} {rel.flag_emoji}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#786C65', display: 'block', mt: 0.5 }}>
                      {rel.total_tips_count} consells · {rel.endorsement_summary}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Community Join Callout */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #C85A32 0%, #A0471D 100%)',
            color: '#FFFFFF',
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(200,90,50,0.25)',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Viatges a {destination.name}? Connecta amb altres FELAGIS ✈️
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto', mb: 3 }}>
            Crea el teu pla de viatge a FELAG per coincidir amb viatgers de la teva terra, compartir consells i viure experiències úniques.
          </Typography>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#FFFFFF',
              color: '#C85A32',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 3,
              px: 4,
              py: 1.2,
              fontSize: '1rem',
              '&:hover': { bgcolor: '#FDF7F4' },
            }}
          >
            Uneix-te a FELAG de franc
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

function getCategoryName(category: string): string {
  switch (category) {
    case 'food':
      return '🍽️ Gastronomia';
    case 'hidden_gem':
      return '💎 Racó Secret';
    case 'transport':
      return '🚆 Mobilitat';
    case 'practical_tip':
      return '💡 Consell Pràctic';
    case 'anecdote':
      return '📖 Curiositat';
    default:
      return '📍 Recomanació';
  }
}

function getCategoryBg(category: string): string {
  switch (category) {
    case 'food':
      return '#FFF3E0';
    case 'hidden_gem':
      return '#EDE7F6';
    case 'transport':
      return '#E0F2FE';
    case 'practical_tip':
      return '#E8F5E9';
    case 'anecdote':
      return '#FCE7F3';
    default:
      return '#F5F5F5';
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'food':
      return '#E65100';
    case 'hidden_gem':
      return '#512DA8';
    case 'transport':
      return '#0369A1';
    case 'practical_tip':
      return '#2E7D32';
    case 'anecdote':
      return '#BE185D';
    default:
      return '#616161';
  }
}
