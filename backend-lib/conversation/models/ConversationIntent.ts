/**
 * Purpose: Defines the canonical set of user intents detected during a conversation.
 * Public API: ConversationIntent enum
 * Dependencies: None
 * Consumers: ConversationState, ConversationEngine
 * Future phases: Will map to specific intent routing handlers and probability scores.
 */

export enum ConversationIntent {
  Greeting = 'GREETING',
  BrowseMenu = 'BROWSE_MENU',
  AddItem = 'ADD_ITEM',
  RemoveItem = 'REMOVE_ITEM',
  ModifyItem = 'MODIFY_ITEM',
  Checkout = 'CHECKOUT',
  Payment = 'PAYMENT',
  TrackOrder = 'TRACK_ORDER',
  Cancel = 'CANCEL',
  Help = 'HELP',
  Confirmation = 'CONFIRMATION',
  Unknown = 'UNKNOWN',
}
