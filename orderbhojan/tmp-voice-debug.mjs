import { parseCartAddUserMessage } from './src/features/assistant/domain/isCartAddUserMessage.ts';
import { resolveCartPlanRestaurantId } from './src/features/assistant/domain/resolveCartPlanRestaurant.ts';
import { matchKitchenFragmentInMessage } from './src/features/assistant/domain/matchOrderingVocabulary.ts';

const text = 'add masala dosa from money';
console.log('parsed', parseCartAddUserMessage(text));
const kitchens = [{id:'obr_mana-inti', name:'Mana Inti'},{id:'obr_inti',name:'Inti Bhojanam'}];
console.log('match', matchKitchenFragmentInMessage(text, kitchens));
console.log('resolve', resolveCartPlanRestaurantId({plan:{type:'cart_add_plan',requiresConfirmation:true,executable:false,payload:{name:'Masala Dosa'}}, userMessage:text, nearbyKitchens:kitchens, activeRestaurantId:'obr_inti'}));
