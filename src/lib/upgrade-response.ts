/** Апгрейд до WebSocket (101 с webSocket) нельзя пересоздать через new Response: рантайм бросает «status codes in the range 200 to 599». */
export function isUpgradeResponse(response: Response): boolean {
  return response.status === 101 || Boolean((response as Response & { webSocket?: unknown }).webSocket);
}
