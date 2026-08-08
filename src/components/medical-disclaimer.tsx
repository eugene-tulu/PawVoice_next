export default function MedicalDisclaimer() {
  return (
    <aside className="p-4 border border-rule rounded-lg bg-paper-2">
      <p className="text-xs text-muted leading-relaxed">
        <strong className="text-ink">Disclaimer</strong> PawVoice is a voice-to-text activity log for pet-sitters and
        owners. It records activities and observations verbatim. It is <em>not</em> a medical
        diary and does not provide diagnosis, treatment, or veterinary advice. If your pet shows
        signs of illness, contact a licensed veterinarian. Notes are transcribed as spoken.
      </p>
    </aside>
  );
}
