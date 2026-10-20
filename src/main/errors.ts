/** An error whose message is written for the user and safe to show in the UI. */
export class UserError extends Error {
  override name = 'UserError'
}
