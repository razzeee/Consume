import { useEffect, useMemo, useState } from 'react'

type Props = {
  alt: string
  candidates: string[]
  className?: string
  title?: string
  loading?: 'lazy' | 'eager'
}

export default function WowIcon({
  alt,
  candidates,
  className,
  title,
  loading = 'lazy',
}: Props) {
  const filteredCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.trim().length > 0),
    [candidates],
  )
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => {
    setCandidateIndex(0)
  }, [filteredCandidates])

  if (filteredCandidates.length === 0) {
    return null
  }

  const src =
    filteredCandidates[Math.min(candidateIndex, filteredCandidates.length - 1)]

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      loading={loading}
      className={className}
      onError={() => {
        setCandidateIndex((current) =>
          Math.min(current + 1, filteredCandidates.length - 1),
        )
      }}
    />
  )
}
