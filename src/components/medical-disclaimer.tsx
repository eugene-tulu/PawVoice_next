export default function MedicalDisclaimer() {
  return (
    <aside className="mt-8 p-4 border border-amber-200 dark:border-amber-900/30 rounded-lg bg-amber-50/30 dark:bg-amber-900/10">
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        <strong>Disclaimer</strong> PawVoice is a voice-to-text activity log for pet-sitters and
        owners. It records activities and observations verbatim. It is <em>not</em> a medical
        diary and does not provide diagnosis, treatment, or veterinary advice. If your pet shows
        signs of illness, contact a licensed veterinarian. Notes are transcribed as spoken.
      </p>
    </aside>
  );
}
