import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireStaff, AuthenticatedRequest } from '../auth.js';
import { InternalTask } from '../types.js';

const router = Router();

// GET /api/tasks?deliveryId=... (Client users NEVER see internal tasks - AC06)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { deliveryId } = req.query;
  const currentUser = req.user!;
  let tasks = db.getTasks();

  if (deliveryId) {
    tasks = tasks.filter(t => t.deliveryId === String(deliveryId));
  }

  // Client user isolation (AC06): internal tasks must NEVER appear to clients
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    return res.json({ tasks: [] }); // Clients have no access to internal checklists
  }

  return res.json({ tasks });
});

// POST /api/tasks (Staff only)
router.post('/', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { deliveryId, title, type, assigneeId } = req.body;

  if (!deliveryId || !title) {
    return res.status(400).json({ error: 'deliveryId e title são obrigatórios.' });
  }

  const delivery = db.getDeliveries().find(d => d.id === deliveryId);
  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada.' });
  }

  let assigneeName: string | undefined = undefined;
  if (assigneeId) {
    const user = db.getUsers().find(u => u.id === assigneeId);
    assigneeName = user?.name;
  }

  const newTask: InternalTask = {
    id: `tsk_${Date.now()}`,
    deliveryId,
    title,
    type: type || 'outro',
    assigneeId: assigneeId || undefined,
    assigneeName,
    completed: false,
    isInternal: true,
    version: 1
  };

  db.getTasks().push(newTask);
  db.save();

  return res.status(201).json({
    task: newTask,
    message: 'Tarefa interna criada com sucesso.'
  });
});

// POST /api/tasks/:id/claim (Atomic task claim - RF07, AC04)
router.post('/:id/claim', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;

  const result = db.atomicClaimTask(id, currentUser.id, currentUser.name);

  if (!result.success) {
    // Return 409 Conflict for concurrent claim collision (AC04)
    return res.status(409).json({
      error: 'Conflito de atribuição (AC04)',
      message: result.message,
      task: result.task
    });
  }

  return res.json({
    task: result.task,
    message: `Tarefa assumida por ${currentUser.name} com sucesso.`
  });
});

// POST /api/tasks/:id/unassign (Staff or admin can release/reallocate task)
router.post('/:id/unassign', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const task = db.getTasks().find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  task.assigneeId = undefined;
  task.assigneeName = undefined;
  task.version += 1;
  db.save();

  return res.json({
    task,
    message: 'Tarefa disponibilizada para atribuição na fila.'
  });
});

// PATCH /api/tasks/:id/toggle (Toggle complete)
router.patch('/:id/toggle', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const task = db.getTasks().find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : undefined;
  task.version += 1;
  db.save();

  return res.json({
    task,
    message: task.completed ? 'Tarefa marcada como concluída.' : 'Tarefa reaberta.'
  });
});

export default router;
