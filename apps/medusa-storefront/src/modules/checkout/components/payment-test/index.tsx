import { Badge } from "@medusajs/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">Local test flow:</span> payment is
      collected outside checkout in this environment.
    </Badge>
  )
}

export default PaymentTest
