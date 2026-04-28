const ErrorMessage = ({ error, 'data-testid': dataTestid }: { error?: string | null, 'data-testid'?: string }) => {
  if (!error) {
    return null
  }

  return (
    <div
      className="pt-2 text-sm flex items-center gap-1.5"
      style={{ color: "var(--coral)" }}
      data-testid={dataTestid}
    >
      <span>⚠</span>
      <span>{error}</span>
    </div>
  )
}

export default ErrorMessage
