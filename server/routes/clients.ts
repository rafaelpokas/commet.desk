import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { Client } from '../types.js';

const router = Router();

// List clients (Staff gets all, Client gets only their own - AC01)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const allClients = db.getClients();

  if (currentUser.role === 'admin' || currentUser.role === 'employee') {
    return res.json({ clients: allClients });
  }

  // Client user: strictly their own client (AC01)
  const clientOnly = allClients.filter(c => c.id === currentUser.clientId);
  return res.json({ clients: clientOnly });
});

// Get single client
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;

  // Strict isolation check (AC01)
  if (currentUser.role !== 'admin' && currentUser.role !== 'employee') {
    if (currentUser.clientId !== id) {
      return res.status(403).json({
        error: 'Acesso Proibido',
        message: 'Acesso negado: isolamento rigoroso de dados entre clientes.'
      });
    }
  }

  const client = db.getClients().find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  return res.json({ client });
});

// Admin only: create client
router.post('/', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, tradeName, timezone, channels, brandKit } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }

  const newClient: Client = {
    id: `cli_${Date.now()}`,
    name,
    tradeName: tradeName || name,
    status: 'active',
    timezone: timezone || 'America/Sao_Paulo',
    channels: channels || ['instagram', 'linkedin'],
    brandKit: brandKit || {
      primaryColor: '#0284c7',
      secondaryColor: '#f59e0b',
      guidelinesNotes: '',
      fonts: ['Plus Jakarta Sans']
    },
    createdAt: new Date().toISOString()
  };

  db.getClients().push(newClient);
  db.save();

  return res.status(201).json({
    client: newClient,
    message: 'Cliente cadastrado com sucesso.'
  });
});

// Admin only: update client
router.patch('/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetClient = db.getClients().find(c => c.id === id);

  if (!targetClient) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  const { name, tradeName, status, timezone, channels, brandKit } = req.body;
  if (name !== undefined) targetClient.name = name;
  if (tradeName !== undefined) targetClient.tradeName = tradeName;
  if (status !== undefined) targetClient.status = status;
  if (timezone !== undefined) targetClient.timezone = timezone;
  if (channels !== undefined) targetClient.channels = channels;
  if (brandKit !== undefined) {
    targetClient.brandKit = { ...targetClient.brandKit, ...brandKit };
  }

  db.save();

  return res.json({
    client: targetClient,
    message: 'Dados do cliente atualizados com sucesso.'
  });
});

export default router;
