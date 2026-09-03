import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import { StoriesCardData } from '../types';

interface InstagramStoriesCardProps {
  data: StoriesCardData;
}

export default function InstagramStoriesCard({ data }: InstagramStoriesCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Fallback placeholder images if no photos in data
  const photos = data.featured_photos && data.featured_photos.length > 0
    ? data.featured_photos.slice(0, 4)
    : [
        'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&auto=format&fit=crop&q=80',
      ];

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

    // Photos 2x2 mosaic on canvas
    const mosaicY = 590;
    const imgW = 440;
    const imgH = 460;
    const gap = 40;

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          const fallback = new Image();
          fallback.onload = () => resolve(fallback);
          fallback.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%234A3B32" width="400" height="400"/><text fill="%23FFE082" x="50%" y="50%" text-anchor="middle" font-size="28" font-family="sans-serif">FELAG Photo</text></svg>';
        };
        img.src = src;
      });

    const loadedImages = await Promise.all(photos.map(loadImg));

    loadedImages.slice(0, 4).forEach((img, i) => {
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
      link.download = `FELAG-Stories-${data.trip_title.replace(/\s+/g, '-')}.png`;
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
        // Fallback download if share not supported
        const link = document.createElement('a');
        link.download = `FELAG-Stories-${data.trip_title.replace(/\s+/g, '-')}.png`;
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

        {/* 2x2 Photos Mosaic */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0.75,
            height: { xs: 180, sm: 205 },
            my: 0.5,
          }}
        >
          {photos.map((src, idx) => (
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
