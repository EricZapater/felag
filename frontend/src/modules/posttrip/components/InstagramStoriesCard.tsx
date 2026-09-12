import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import CollectionsIcon from '@mui/icons-material/Collections';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { StoriesCardData, TripPhoto } from '../types';

interface InstagramStoriesCardProps {
  data: StoriesCardData;
  availablePhotos?: TripPhoto[];
}

const DEFAULT_FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80',
];

export default function InstagramStoriesCard({ data, availablePhotos = [] }: InstagramStoriesCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Pool of all candidate photo URLs from trip album or data
  const candidateUrls: string[] = Array.from(
    new Set([
      ...(availablePhotos.map((p) => p.image_url).filter(Boolean)),
      ...(data.featured_photos || []).filter(Boolean),
    ])
  );

  const initialPhotos = candidateUrls.length > 0
    ? candidateUrls.slice(0, 4)
    : DEFAULT_FALLBACK_PHOTOS;

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(initialPhotos);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  // Slideshow state
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  useEffect(() => {
    if (candidateUrls.length > 0 && selectedPhotos.length === 0) {
      setSelectedPhotos(candidateUrls.slice(0, 4));
    }
  }, [candidateUrls.length]);

  // Slideshow timer
  useEffect(() => {
    let timer: any;
    if (isSlideshowActive && candidateUrls.length > 1) {
      timer = setInterval(() => {
        setSlideshowIndex((prev) => (prev + 1) % candidateUrls.length);
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSlideshowActive, candidateUrls.length]);

  const togglePhotoSelection = (url: string) => {
    if (selectedPhotos.includes(url)) {
      if (selectedPhotos.length <= 1) {
        setSnackbarMessage('Cal mantenir almenys 1 foto a la plantilla.');
        return;
      }
      setSelectedPhotos(selectedPhotos.filter((p) => p !== url));
    } else {
      if (selectedPhotos.length >= 4) {
        setSnackbarMessage('La plantilla 9:16 admet un màxim de 4 fotos destacades per mantenir el disseny net.');
        return;
      }
      setSelectedPhotos([...selectedPhotos, url]);
    }
  };

  // Helper to load image securely for canvas (avoiding CORS issues)
  const loadImgSecurely = async (src: string): Promise<HTMLImageElement> => {
    try {
      // First try fetching as blob to create local object URL (bypasses canvas tainting)
      const resp = await fetch(src, { mode: 'cors' });
      if (resp.ok) {
        const blob = await resp.blob();
        const objUrl = URL.createObjectURL(blob);
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(createSvgFallbackImage());
          img.src = objUrl;
        });
      }
    } catch {
      // Fallback direct image loading
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(createSvgFallbackImage());
      img.src = src;
    });
  };

  const createSvgFallbackImage = (): HTMLImageElement => {
    const fallback = new Image();
    fallback.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect fill="%233E2F29" width="500" height="500"/><text fill="%23FFE082" x="50%" y="50%" text-anchor="middle" font-size="32" font-family="sans-serif">FELAG ✈️</text></svg>';
    return fallback;
  };

  const generateCanvasImage = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, '#2C221E');
    grad.addColorStop(0.4, '#1F1714');
    grad.addColorStop(1, '#120D0B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative top accent bar
    ctx.fillStyle = '#C85A32';
    ctx.fillRect(0, 0, 1080, 24);

    // Header FELAG brand & Flag
    ctx.fillStyle = '#C85A32';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.fillText('FELAG ✈️', 80, 140);

    ctx.font = '54px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.country_flag || '🌍', 1000, 140);
    ctx.textAlign = 'left';

    // Trip Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px -apple-system, sans-serif';
    const title = data.trip_title || 'Aventura FELAG';
    ctx.fillText(title.length > 28 ? title.slice(0, 28) + '...' : title, 80, 250);

    // Subtitle / Author
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '500 36px -apple-system, sans-serif';
    const dateText = `${data.start_date || ''} - ${data.end_date || ''} • Per ${data.author_name || 'FELAGI'}${
      data.author_origin ? ` (${data.author_origin})` : ''
    }`;
    ctx.fillText(dateText, 80, 315);

    // Stats Grid Box
    const statBoxY = 380;
    const statBoxWidth = 280;
    const statBoxHeight = 160;
    const statBoxGap = 40;
    const statStartX = 80;

    const stats = [
      { val: `${data.total_days || 1}`, lbl: 'DIES' },
      { val: `${data.stages_count || 1}`, lbl: 'ETAPES' },
      { val: `${data.felagis_met_count || 0}`, lbl: 'FELAGIS' },
    ];

    stats.forEach((s, i) => {
      const bx = statStartX + i * (statBoxWidth + statBoxGap);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(bx, statBoxY, statBoxWidth, statBoxHeight, 20);
      ctx.fill();

      ctx.fillStyle = '#FFE082';
      ctx.font = 'bold 58px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.val, bx + statBoxWidth / 2, statBoxY + 80);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 26px -apple-system, sans-serif';
      ctx.fillText(s.lbl, bx + statBoxWidth / 2, statBoxY + 128);
    });

    ctx.textAlign = 'left';

    // Photos dynamic layouts (1 to 4 photos)
    const activePhotosToDraw = selectedPhotos.slice(0, 4);
    const loadedImages = await Promise.all(activePhotosToDraw.map(loadImgSecurely));

    const mosaicY = 590;
    const totalW = 920;
    const totalH = 1010;
    const gap = 24;

    if (loadedImages.length === 1) {
      // 1 Hero Photo layout
      const img = loadedImages[0];
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(80, mosaicY, totalW, totalH, 28);
      ctx.clip();
      ctx.drawImage(img, 80, mosaicY, totalW, totalH);
      ctx.restore();
    } else if (loadedImages.length === 2) {
      // 2 Photos vertical split layout
      const hEach = (totalH - gap) / 2;
      loadedImages.forEach((img, i) => {
        const iy = mosaicY + i * (hEach + gap);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(80, iy, totalW, hEach, 24);
        ctx.clip();
        ctx.drawImage(img, 80, iy, totalW, hEach);
        ctx.restore();
      });
    } else if (loadedImages.length === 3) {
      // 3 Photos collage layout (1 large top + 2 bottom)
      const topH = 540;
      const botH = totalH - topH - gap;
      const botW = (totalW - gap) / 2;

      // Top image
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(80, mosaicY, totalW, topH, 24);
      ctx.clip();
      ctx.drawImage(loadedImages[0], 80, mosaicY, totalW, topH);
      ctx.restore();

      // 2 Bottom images
      [loadedImages[1], loadedImages[2]].forEach((img, i) => {
        const ix = 80 + i * (botW + gap);
        const iy = mosaicY + topH + gap;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ix, iy, botW, botH, 24);
        ctx.clip();
        ctx.drawImage(img, ix, iy, botW, botH);
        ctx.restore();
      });
    } else {
      // 4 Photos 2x2 grid layout
      const imgW = (totalW - gap) / 2;
      const imgH = (totalH - gap) / 2;

      loadedImages.forEach((img, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ix = 80 + col * (imgW + gap);
        const iy = mosaicY + row * (imgH + gap);

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ix, iy, imgW, imgH, 24);
        ctx.clip();
        try {
          ctx.drawImage(img, ix, iy, imgW, imgH);
        } catch {
          ctx.fillStyle = '#4A3B32';
          ctx.fillRect(ix, iy, imgW, imgH);
        }
        ctx.restore();
      });
    }

    // Footer divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 1640);
    ctx.lineTo(1000, 1640);
    ctx.stroke();

    // Footer text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 38px -apple-system, sans-serif';
    ctx.fillText('Viatja pel món, connecta amb la teva terra', 540, 1720);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 28px -apple-system, sans-serif';
    ctx.fillText('felag.app • @felag.app', 540, 1775);

    return canvas.toDataURL('image/png');
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateCanvasImage();
      const link = document.createElement('a');
      link.download = `FELAG-Stories-${(data.trip_title || 'Viatge').replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      setSnackbarMessage('Targeta 9:16 descarregada correctament! 📥');
    } catch {
      setSnackbarMessage('Error en generar la imatge per descarregar');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateCanvasImage();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'felag-stories.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `El meu viatge a ${data.trip_title} amb FELAG`,
          text: 'Mira el resum del meu viatge generat a FELAG!',
        });
        setSnackbarMessage('Reportatge compartit! 📲');
      } else if (navigator.share) {
        await navigator.share({
          title: `El meu viatge a ${data.trip_title} amb FELAG`,
          text: `Viatge a ${data.trip_title} amb FELAG! #felag #viatges`,
          url: window.location.href,
        });
        setSnackbarMessage('Enllaç compartit!');
      } else {
        const link = document.createElement('a');
        link.download = `FELAG-Stories-${(data.trip_title || 'Viatge').replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
        setSnackbarMessage('Imatge descarregada per compartir manualment a Stories!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSnackbarMessage('No s’ha pogut compartir el reportatge.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const numPhotos = selectedPhotos.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Informative Limits Notice Banner */}
      <Box
        sx={{
          bgcolor: 'rgba(200, 90, 50, 0.08)',
          border: '1px solid rgba(200, 90, 50, 0.25)',
          borderRadius: 2.5,
          p: 1.5,
          mb: 2,
          maxWidth: 340,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <InfoOutlinedIcon sx={{ color: '#C85A32', fontSize: 18, mt: 0.2 }} />
        <Typography sx={{ fontSize: '0.75rem', color: '#5C4339', lineHeight: 1.4 }}>
          <strong>Plantilla Stories 9:16:</strong> Dissenyada per a <strong>1 fins a 4 fotografies</strong> per a un resultat nítid i llegible a xarxes.
        </Typography>
      </Box>

      {/* Controls Bar: Layout / Photo Picker / Slideshow Toggle */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 2,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Button
          size="small"
          variant={showPhotoSelector ? 'contained' : 'outlined'}
          onClick={() => setShowPhotoSelector(!showPhotoSelector)}
          startIcon={<CollectionsIcon />}
          sx={{
            textTransform: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            borderRadius: 2,
            borderColor: '#C85A32',
            color: showPhotoSelector ? '#FFFFFF' : '#C85A32',
            bgcolor: showPhotoSelector ? '#C85A32' : 'transparent',
            '&:hover': { bgcolor: showPhotoSelector ? '#A0471D' : 'rgba(200,90,50,0.08)' },
          }}
        >
          {showPhotoSelector ? 'Tancar Selecció' : `Triar Fotos (${selectedPhotos.length}/4)`}
        </Button>

        {candidateUrls.length > 1 && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsSlideshowActive(!isSlideshowActive)}
            startIcon={isSlideshowActive ? <PauseIcon /> : <PlayArrowIcon />}
            sx={{
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: 2,
              borderColor: '#8D7B74',
              color: isSlideshowActive ? '#C85A32' : '#5C4339',
            }}
          >
            {isSlideshowActive ? 'Pausar Carrusel' : 'Mode Carrusel'}
          </Button>
        )}
      </Box>

      {/* Photo Selector Drawer / Panel */}
      {showPhotoSelector && (
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E8E2D9',
            borderRadius: 3,
            p: 2,
            mb: 2.5,
            maxWidth: 340,
            width: '100%',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#2C221E' }}>
              📸 Fotos de l'àlbum ({selectedPhotos.length}/4 seleccionades)
            </Typography>
            <Chip
              label={`${selectedPhotos.length} fotos`}
              size="small"
              sx={{ bgcolor: '#FDEEE9', color: '#C85A32', fontWeight: 800, fontSize: '0.7rem' }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              maxHeight: 180,
              overflowY: 'auto',
              p: 0.5,
            }}
          >
            {candidateUrls.map((url, idx) => {
              const isSelected = selectedPhotos.includes(url);
              return (
                <Box
                  key={idx}
                  onClick={() => togglePhotoSelection(url)}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    pt: '100%',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '3px solid #C85A32' : '1px solid #E8E2D9',
                    boxShadow: isSelected ? '0 0 8px rgba(200,90,50,0.4)' : 'none',
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt={`Opció ${idx + 1}`}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: isSelected ? 1 : 0.6,
                    }}
                  />
                  {isSelected && (
                    <CheckCircleIcon
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        color: '#C85A32',
                        bgcolor: '#FFFFFF',
                        borderRadius: '50%',
                        fontSize: 16,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* 9:16 Instagram Card Preview Container */}
      <Box
        ref={cardRef}
        sx={{
          width: { xs: 290, sm: 320 },
          height: { xs: 515, sm: 568 }, // 9:16 ratio
          background: 'linear-gradient(180deg, #2C221E 0%, #1A1412 100%)',
          borderRadius: '24px',
          p: { xs: 2.2, sm: 2.5 },
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          position: 'relative',
          overflow: 'hidden',
          border: '4px solid #3E2F29',
        }}
      >
        {/* Top Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#C85A32',
              letterSpacing: 1,
            }}
          >
            FELAG ✈️
          </Typography>
          <Typography sx={{ fontSize: '1.2rem' }}>{data.country_flag || '🌍'}</Typography>
        </Box>

        {/* Title Box */}
        <Box sx={{ my: 0.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              color: '#FFFFFF',
              lineHeight: 1.2,
            }}
          >
            {data.trip_title}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              opacity: 0.8,
              mt: 0.5,
            }}
          >
            {data.start_date} - {data.end_date} • Per {data.author_name}
            {data.author_origin ? ` (${data.author_origin})` : ''}
          </Typography>
        </Box>

        {/* Stats Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0.75,
            my: 0.5,
          }}
        >
          <Box
            sx={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              p: 0.75,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FFE082' }}>
              {data.total_days}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', opacity: 0.75, textTransform: 'uppercase' }}>
              Dies
            </Typography>
          </Box>
          <Box
            sx={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              p: 0.75,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FFE082' }}>
              {data.stages_count}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', opacity: 0.75, textTransform: 'uppercase' }}>
              Etapes
            </Typography>
          </Box>
          <Box
            sx={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              p: 0.75,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FFE082' }}>
              {data.felagis_met_count}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', opacity: 0.75, textTransform: 'uppercase' }}>
              FELAGIS
            </Typography>
          </Box>
        </Box>

        {/* Dynamic Photos Layout (1, 2, 3 or 4 photos OR Slideshow) */}
        <Box
          sx={{
            height: { xs: 180, sm: 205 },
            my: 0.5,
            position: 'relative',
          }}
        >
          {isSlideshowActive ? (
            // Slideshow Single Image View
            <Box
              component="img"
              src={candidateUrls[slideshowIndex] || selectedPhotos[0]}
              alt="Slideshow"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.15)',
                transition: 'opacity 0.4s ease-in-out',
              }}
            />
          ) : numPhotos === 1 ? (
            // 1 Hero Photo
            <Box
              component="img"
              src={selectedPhotos[0]}
              alt="Foto Hero"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 2.5,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
          ) : numPhotos === 2 ? (
            // 2 Photos Split
            <Box sx={{ display: 'grid', gridTemplateRows: 'repeat(2, 1fr)', gap: 0.75, height: '100%' }}>
              {selectedPhotos.map((src, idx) => (
                <Box
                  key={idx}
                  component="img"
                  src={src}
                  alt={`Foto ${idx + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </Box>
          ) : numPhotos === 3 ? (
            // 3 Photos Collage (1 top, 2 bottom)
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, height: '100%' }}>
              <Box
                component="img"
                src={selectedPhotos[0]}
                alt="Foto 1"
                sx={{
                  width: '100%',
                  height: '52%',
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75, height: '44%' }}>
                {selectedPhotos.slice(1, 3).map((src, idx) => (
                  <Box
                    key={idx}
                    component="img"
                    src={src}
                    alt={`Foto ${idx + 2}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            // 4 Photos 2x2 Grid
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 0.75,
                height: '100%',
              }}
            >
              {selectedPhotos.slice(0, 4).map((src, idx) => (
                <Box
                  key={idx}
                  component="img"
                  src={src}
                  alt={`Foto ${idx + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            textAlign: 'center',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            pt: 1,
            mt: 0.5,
          }}
        >
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FFE082' }}>
            Viatja pel món, connecta amb la teva terra
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', opacity: 0.7, mt: 0.2 }}>
            felag.app • @felag.app
          </Typography>
        </Box>
      </Box>

      {/* Story Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mt: 2,
          width: { xs: 290, sm: 320 },
        }}
      >
        <Button
          onClick={handleDownload}
          disabled={isExporting}
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          sx={{
            bgcolor: '#2C221E',
            color: '#FFFFFF',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.85rem',
            borderRadius: 2.5,
            flex: 1,
            '&:hover': { bgcolor: '#1A1412' },
          }}
        >
          {isExporting ? 'Generant...' : 'Descarregar'}
        </Button>

        <Button
          onClick={handleShare}
          disabled={isExporting}
          variant="contained"
          startIcon={<ShareIcon />}
          sx={{
            background:
              'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            color: '#FFFFFF',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.85rem',
            borderRadius: 2.5,
            flex: 1.3,
            '&:hover': { opacity: 0.92 },
          }}
        >
          Compartir 9:16
        </Button>
      </Box>

      {/* Snackbar feedback */}
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={3500}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarMessage(null)}
          severity="success"
          sx={{ width: '100%', bgcolor: '#2C221E', color: '#FFFFFF' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

