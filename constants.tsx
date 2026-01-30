
import { Material, Cliente } from './types';

export const MOCK_MATERIALS: Material[] = [
  { id: '1', codigo: 'PLC-S7-1200', descripcion: 'CPU Siemens S7-1200 1214C DC/DC/DC', marca: 'Siemens', valor: 450.00 },
  { id: '2', codigo: 'HMI-KTP700', descripcion: 'Panel Táctil KTP700 Basic 7"', marca: 'Siemens', valor: 680.00 },
  { id: '3', codigo: 'INV-001', descripcion: 'Inversor de Frecuencia 1HP 220V', marca: 'WEG', valor: 210.00 },
  { id: '4', codigo: 'CAB-ETH-05', descripcion: 'Cable Ethernet Blindado Cat6 5m', marca: 'Schneider', valor: 25.00 },
  { id: '5', codigo: 'TER-DIG-02', descripcion: 'Termostato Digital Programable', marca: 'Honeywell', valor: 120.50 },
  { id: '6', codigo: 'SEN-IND-18', descripcion: 'Sensor Inductivo M18 NPN NO', marca: 'Balluff', valor: 45.00 },
  { id: '7', codigo: 'FUE-24V-10', descripcion: 'Fuente de Alimentación 24VDC 10A', marca: 'MeanWell', valor: 85.00 },
];

export const MOCK_CLIENTES: Cliente[] = [
  { id: 'c1', nombre: 'Juan Pérez', empresa: 'Lácteos El Trébol', cuit: '20-12345678-9', email: 'juan@lacteos.com' },
  { id: 'c2', nombre: 'Maria García', empresa: 'Fábrica Automotriz Sur', cuit: '27-87654321-0', email: 'mgarcia@surauto.com' },
  { id: 'c3', nombre: 'Carlos Ruiz', empresa: 'Metalúrgica San José', cuit: '20-44556677-3', email: 'carlos@sanjose.com' },
];
