import { getTickerMessages } from "@lib/data/ticker"
import TickerTrack from "./ticker-track"

export default async function Ticker() {
  const messages = await getTickerMessages()
  return <TickerTrack messages={messages} />
}
