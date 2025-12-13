export default function Header() {
  return (
    <header className="
      bg-white/50
      backdrop-blur-xl
      border-b border-white/30
      px-6 py-4
      flex justify-between items-center
    ">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">
          Student Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Multi-Agent Academic Assistant
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          Mohith · CSE · Sem 6
        </div>
        <div className="
          w-9 h-9
          rounded-full
          bg-indigo-200
          flex items-center justify-center
          font-semibold text-indigo-700
        ">
          M
        </div>
      </div>
    </header>
  )
}
