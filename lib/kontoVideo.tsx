/* v82 — Konto-Seiten: rechts ein stummes Endlos-Video, das wie ein
   «lebendes Bild» wirkt (keine Controls, kein Ton, nahtloser Loop per
   Überblendung im Encode). Poster malt sofort, Video lädt nach (~430 KB). */
export function KontoVideo() {
  return (
    <video
      className="konto-video"
      src="/konto/konto.mp4"
      poster="/konto/konto.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden
      tabIndex={-1}
    />
  );
}
