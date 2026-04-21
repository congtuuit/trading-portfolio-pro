const fs = require('fs');
let code = fs.readFileSync('ui.js', 'utf8');

const funcDefs = [
  'export function bindAIEvents(onAskAI) {',
  'export function bindHistoryEvents(cbClear) {',
  'export function bindSettingsEvents(settings, onSaveSettings, onFetchModels) {',
  'export function bindFormEvents(onSave) {',
  'export function populateForm(trade) {',
  'function clearForm() {',
  'function showError(id, message) {',
  'function clearErrors() {'
];
const funcReplacements = [
  'export function bindAIEvents(onAskAI, root = document) {',
  'export function bindHistoryEvents(cbClear, root = document) {',
  'export function bindSettingsEvents(settings, onSaveSettings, onFetchModels, root = document) {',
  'export function bindFormEvents(onSave, root = document) {',
  'export function populateForm(trade, root = document) {',
  'export function clearForm(root = document) {',
  'export function showError(id, message, root = document) {',
  'export function clearErrors(root = document) {'
];

for(let i=0; i<funcDefs.length; i++) {
  code = code.replace(funcDefs[i], funcReplacements[i]);
}

code = code.replace(/document\.getElementById\(([\"'])(.*?)\1\)/g, 'root.querySelector("#$2")');
code = code.replace(/document\.querySelector\(/g, 'root.querySelector(');
code = code.replace(/document\.querySelectorAll\(/g, 'root.querySelectorAll(');

fs.writeFileSync('ui.js', code);
console.log('ui.js refactored successfully.');
