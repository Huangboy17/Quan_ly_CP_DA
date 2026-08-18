import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ProjectsView from './src/components/projects/ProjectsView.jsx';

const data = {
  projects: [{ id: 1, name: 'Proj 1', created_at: null, start_date: null, execution_time: null, tmdt_history: null }],
  contracts: [{ id: 10, project_id: 1, contractValueAfterVAT: null, settlement_amount_after_vat: null, signing_date: null, execution_days: null, end_date: null }],
  payments: [{ id: 100, contract_id: 10, amount_after_vat: null, payment_date: null }],
  filteredPayments: [],
  inPeriodPayments: [],
};

try {
  const html = renderToStaticMarkup(createElement(ProjectsView, { data }));
  console.log('Rendered successfully, length:', html.length);
} catch (e) {
  console.error('Crash:', e.message);
  console.error(e.stack);
}

