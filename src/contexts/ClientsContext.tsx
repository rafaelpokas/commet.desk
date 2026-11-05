import React, { createContext, useContext } from 'react';
import type { Client } from '../types';
export const ClientsContext = createContext<Client[]>([]);
export function useClientName(id?: string) { return useContext(ClientsContext).find(c => c.id === id)?.name || 'Cliente'; }
export function ClientName({ id }: { id?: string }) { return <>{useClientName(id)}</>; }
