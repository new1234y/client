export default function CoinBurst({ active }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[10040] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={index}
          className="coin-burst-particle absolute left-1/2 top-1/2 h-4 w-4 rounded-full border-2 border-yellow-200 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,.8)]"
          style={{ "--coin-angle": `${index * 25.7}deg`, "--coin-delay": `${index * 35}ms` }}
        />
      ))}
    </div>
  );
}
