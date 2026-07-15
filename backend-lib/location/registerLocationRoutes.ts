import type { Express } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { handleLocationReverse } from '../../api/location/reverse.js';
import { handleLocationSearch } from '../../api/location/search.js';
import { handleLocationServiceability } from '../../api/location/serviceability.js';

export function registerLocationRoutes(app: Express, db?: Firestore): void {
  const prefix = '/api/location';

  app.get(`${prefix}/reverse`, (req, res) => {
    void handleLocationReverse(req, res);
  });

  app.get(`${prefix}/search`, (req, res) => {
    void handleLocationSearch(req, res);
  });

  app.post(`${prefix}/serviceability`, (req, res) => {
    void handleLocationServiceability(req, res, db);
  });
}
