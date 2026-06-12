import { getFirestore } from "firebase-admin/firestore";
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export interface BrainMenuItem {
  id: string;
  name: string;
  aliases: string[];
  price: number;
  category: string;
  isAvailable: boolean;
  type: string;
}

export class StoreBrain {
  public menu: Map<string, BrainMenuItem> = new Map();
  public pincodes: Set<string> = new Set([
    '411001', '411002', '411003', '411004', '411005', '411006', '411007', '411008', '411009',
    '411011', '411012', '411013', '411014', '411015', '411016', '411017', '411018', '411019',
    '411020', '411021', '411022', '411023', '411024', '411025', '411026', '411027', '411028',
    '411029', '411030', '411031', '411032', '411033', '411034', '411035', '411036', '411037',
    '411038', '411039', '411040', '411041', '411042', '411043', '411044', '411045', '411046',
    '411047', '411048', '411051', '411052', '411057', '411058', '411060', '411061', '411062'
  ]); 

  private static instance: StoreBrain;

  public static getInstance(): StoreBrain {
    if (!StoreBrain.instance) {
      StoreBrain.instance = new StoreBrain();
    }
    return StoreBrain.instance;
  }

  public async refresh() {
    logger.info("StoreBrain: Refreshing cache from Firestore...");
    try {
      const db = getFirestore();
      const menuSnap = await db.collection("menu").get();
      
      this.menu.clear();
      
      menuSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!data.name) return;

        const nameParts = data.name.toLowerCase().split(/\s+/);
        const aliases = Array.from(new Set([
          data.name.toLowerCase(),
          ...nameParts,
          data.category?.toLowerCase() || ""
        ])).filter(Boolean);

        this.menu.set(doc.id, {
          id: doc.id,
          name: data.name,
          aliases,
          price: data.price,
          category: data.category || "",
          isAvailable: data.isAvailable !== false,
          type: data.type || "veg"
        });
      });
      
      logger.info(`StoreBrain: Loaded ${this.menu.size} menu items.`);
    } catch (err: any) {
      logger.error(`StoreBrain: Failed to refresh cache: ${err.message}`);
    }
  }

  public findMenuItems(query: string): BrainMenuItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    // 1. Strict exact match
    for (const item of this.menu.values()) {
      if (item.name.toLowerCase() === q) {
        return [item]; 
      }
    }

    // 2. Substring or Alias or Type match
    const results: BrainMenuItem[] = [];
    for (const item of this.menu.values()) {
      if (
        (q.includes("veg") && !q.includes("non-veg") && item.type === "veg") ||
        (q.includes("non-veg") && item.type === "non-veg") ||
        item.name.toLowerCase().includes(q) || 
        item.aliases.some(a => q.includes(a) || a.includes(q))
      ) {
        results.push(item);
      }
    }
    
    // Deduplicate
    return Array.from(new Set(results));
  }
}

export const brain = StoreBrain.getInstance();
