import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get, child } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));
export const qs = new URLSearchParams(location.search);
export const fieldId = qs.get("id") || qs.get("campo") || "calcio1";

export function listen(path, cb){ return onValue(ref(db, path), snap => cb(snap.val())); }
export function write(path, value){ return set(ref(db, path), value); }
export function patch(path, value){ return update(ref(db, path), value); }
export async function read(path){ return (await get(child(ref(db), path))).val(); }

export function asArray(obj){ return Object.entries(obj || {}).map(([id,v]) => ({id, ...v})); }
export function teamName(teams, id){ return teams?.[id]?.name || id || "-"; }
export function fmtStatus(s){ return {scheduled:"programmata",ready:"pronto",in_progress:"in gioco",final:"finale",locked:"bloccata"}[s] || s || "-"; }
export function nowMs(){ return Date.now(); }
export function effectiveGameDuration(tournament){ return Number(tournament?.gameDuration || tournament?.timerDuration || 900); }
export function effectiveBreakDuration(tournament){ return Number(tournament?.breakDuration || 180); }
export function tournamentPhase(tournament){ return tournament?.phase || (tournament?.timerRunning ? "game" : "waiting"); }
export function phaseLabel(phase){ return {waiting:"attesa campi", game:"tempo di gioco", break:"pausa", finished:"torneo finito", paused:"interrotto"}[phase] || phase || "attesa"; }
export function timerRemaining(tournament){
  if(!tournament?.timerRunning || !tournament?.timerStart) return Number(tournament?.timerDuration || effectiveGameDuration(tournament));
  const elapsed = Math.floor((nowMs() - tournament.timerStart) / 1000);
  return Math.max(0, Number(tournament.timerDuration || effectiveGameDuration(tournament)) - elapsed);
}
export function secondaryTimerLabel(tournament){
  const phase = tournamentPhase(tournament);
  if(phase === "game") return `Pausa: ${fmtTime(effectiveBreakDuration(tournament))}`;
  if(phase === "break") return `Prossimo tempo gioco: ${fmtTime(effectiveGameDuration(tournament))}`;
  if(phase === "waiting") return `Tempo gioco: ${fmtTime(effectiveGameDuration(tournament))} · Pausa: ${fmtTime(effectiveBreakDuration(tournament))}`;
  return `Tempo gioco: ${fmtTime(effectiveGameDuration(tournament))}`;
}
export function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}
export function slotStartLabel(tournament, slot){
  const start = tournament?.startTime || "14:00";
  const [h,m] = String(start).split(":").map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return "orario non impostato";
  const offset = (Math.max(1, Number(slot || 1)) - 1) * (effectiveGameDuration(tournament) + effectiveBreakDuration(tournament));
  const total = h*60 + m + Math.floor(offset/60);
  const hh = String(Math.floor(total/60) % 24).padStart(2,"0");
  const mm = String(total % 60).padStart(2,"0");
  return `${hh}:${mm}`;
}

export const DEFAULT_SCORING_RULES = {
  draw: { each: 3 },
  sports: {
    basket: { label: "Basket", margins: [{ code: "MB", maxDiff: 7, winner: 4, loser: 2 },{ code: "MM", maxDiff: 14, winner: 5, loser: 1 },{ code: "MA", maxDiff: null, winner: 6, loser: 0 }] },
    volley: { label: "Pallavolo", margins: [{ code: "MB", maxDiff: 5, winner: 4, loser: 2 },{ code: "MM", maxDiff: 10, winner: 5, loser: 1 },{ code: "MA", maxDiff: null, winner: 6, loser: 0 }] },
    calcio: { label: "Calcio a 5", margins: [{ code: "MB", maxDiff: 2, winner: 4, loser: 2 },{ code: "MM", maxDiff: 3, winner: 5, loser: 1 },{ code: "MA", maxDiff: null, winner: 6, loser: 0 }] },
    ultimate: { label: "Frisbee", margins: [{ code: "MB", maxDiff: 2, winner: 4, loser: 2 },{ code: "MM", maxDiff: 3, winner: 5, loser: 1 },{ code: "MA", maxDiff: null, winner: 6, loser: 0 }] },
    frisbee: { label: "Frisbee", margins: [{ code: "MB", maxDiff: 2, winner: 4, loser: 2 },{ code: "MM", maxDiff: 3, winner: 5, loser: 1 },{ code: "MA", maxDiff: null, winner: 6, loser: 0 }] }
  }
};
export function scoringRules(stateOrRules){ const c = stateOrRules?.scoringRules || stateOrRules; return c?.sports ? c : DEFAULT_SCORING_RULES; }
export function sportKey(sport){
  const raw = String(sport || "").toLowerCase().trim();
  const s = raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[🏀🏐⚽🥏️]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  // Accetta sia i valori interni dell'app sia quelli importati da CSV in italiano.
  if(s.includes("basket") || s === "b" || s === "bb") return "basket";
  if(s.includes("volley") || s.includes("pallavolo") || s === "pall") return "volley";
  if(s.includes("calcio") || s.includes("calcetto") || s.includes("futsal") || s.includes("football") || s === "c5") return "calcio";
  if(s.includes("frisbee") || s.includes("ultimate") || s === "fris") return "ultimate";

  // Fallback per vecchi dati salvati con chiavi gia corrette.
  if(["basket","volley","calcio","ultimate"].includes(s)) return s;
  return s;
}
export function getSportRule(sport, rules){ const all = scoringRules(rules); return all.sports?.[sportKey(sport)] || DEFAULT_SCORING_RULES.sports[sportKey(sport)] || DEFAULT_SCORING_RULES.sports.calcio; }
export function calculateMatchPoints(sport, scoreA, scoreB, rules){
  const a = Number(scoreA || 0), b = Number(scoreB || 0), all = scoringRules(rules);
  if(a === b){ const pts = Number(all.draw?.each ?? 3); return { a: pts, b: pts, margin: "D", diff: 0 }; }
  const diff = Math.abs(a-b), rule = getSportRule(sport, all);
  const margin = (rule.margins || []).find(m => m.maxDiff === null || diff <= Number(m.maxDiff));
  const winner = Number(margin?.winner ?? 3), loser = Number(margin?.loser ?? 0);
  return a > b ? { a:winner, b:loser, margin:margin?.code || "", diff } : { a:loser, b:winner, margin:margin?.code || "", diff };
}
function ensureRow(row, teams, id){ if(id && !row[id]) row[id] = {id, name:teamName(teams,id), pts:0, played:0, wins:0, draws:0, losses:0, gf:0, ga:0}; }
function applyResult(row, match, teams, includeLive, rules){
  if(!match.teamA || !match.teamB) return;
  const count = match.status === "final" || match.status === "locked" || (includeLive && match.status === "in_progress");
  if(!count) return;
  ensureRow(row, teams, match.teamA); ensureRow(row, teams, match.teamB);
  const a = Number(match.scoreA || 0), b = Number(match.scoreB || 0), pts = calculateMatchPoints(match.sport, a, b, rules);
  row[match.teamA].pts += pts.a; row[match.teamB].pts += pts.b;
  row[match.teamA].gf += a; row[match.teamA].ga += b; row[match.teamA].played += 1;
  row[match.teamB].gf += b; row[match.teamB].ga += a; row[match.teamB].played += 1;
  if(a === b){ row[match.teamA].draws += 1; row[match.teamB].draws += 1; }
  else if(a > b){ row[match.teamA].wins += 1; row[match.teamB].losses += 1; }
  else { row[match.teamB].wins += 1; row[match.teamA].losses += 1; }
}
export function computeStandings(teams, matches, rules, mode="live"){
  const base = {};
  for(const [id,t] of Object.entries(teams || {})) base[id] = {id, name:t.name, pts:0, played:0, wins:0, draws:0, losses:0, gf:0, ga:0};
  const off = JSON.parse(JSON.stringify(base)), live = JSON.parse(JSON.stringify(base));
  for(const m of Object.values(matches || {})){ applyResult(off, m, teams, false, rules); applyResult(live, m, teams, true, rules); }
  const use = mode === "official" ? off : live;
  return Object.keys(base).map(id => ({
    id, name:base[id].name, pts:use[id].pts, official:off[id].pts, live:live[id].pts, delta:live[id].pts-off[id].pts,
    played:use[id].played, wins:use[id].wins, draws:use[id].draws, losses:use[id].losses, gf:use[id].gf, ga:use[id].ga, gd:use[id].gf-use[id].ga,
    playedOfficial:off[id].played, playedLive:live[id].played, gfOfficial:off[id].gf, gaOfficial:off[id].ga, gdOfficial:off[id].gf-off[id].ga, gfLive:live[id].gf, gaLive:live[id].ga, gdLive:live[id].gf-live[id].ga
  })).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.name.localeCompare(b.name));
}

export function sportIcon(sport){
  const s = String(sport || "").toLowerCase();
  if(s.includes("basket")) return "🏀";
  if(s.includes("volley") || s.includes("pallav")) return "🏐";
  if(s.includes("calcio") || s.includes("football") || s.includes("futsal")) return "⚽️";
  if(s.includes("frisbee") || s.includes("ultimate")) return "🥏";
  return "•";
}
export function fieldNumber(field){
  const m = String(field || "").match(/(\d+)$/);
  return m ? m[1] : String(field || "-").replace(/[^0-9]/g, "") || "-";
}
export function matchScore(m){
  const a = Number(m?.scoreA ?? 0), b = Number(m?.scoreB ?? 0);
  return `${a}-${b}`;
}

export function describeMatchPoints(match, rules){
  if(!match || match.scoreA === undefined || match.scoreB === undefined) return "-";
  const pts = calculateMatchPoints(match.sport, match.scoreA, match.scoreB, rules);
  return `${pts.a}-${pts.b}${pts.margin && pts.margin !== "D" ? ` ${pts.margin}` : pts.margin === "D" ? " pareggio" : ""}`;
}
export function playoffSeedRows(teams, matches, rules){ return computeStandings(teams, matches, rules, "official").slice(0,16); }
export function canChooseSport(playoffs, teamId, sport, currentId=null){
  const chosen = Object.entries(playoffs?.matches || {}).filter(([id,m]) => id !== currentId && m.chooser === teamId && sportKey(m.sport) === sportKey(sport));
  return chosen.length === 0;
}
export function isPlayoffMode(tournament){ return tournament?.mode === "playoff" && tournament?.playoffRound; }
export function playoffRoundLabel(round){ return {r16:"Ottavi", qf:"Quarti", sf:"Semifinali", final:"Finale"}[round] || round || "Playoff"; }

export const ADMIN_PASSWORD = "smef2026";
export function isAdminUnlocked(){ return sessionStorage.getItem("smef_admin_unlocked") === "1"; }
export function lockAdmin(){ sessionStorage.removeItem("smef_admin_unlocked"); location.href = "index.html"; }
export function requireAdmin(){
  if(isAdminUnlocked()) return true;
  const main = document.querySelector('#app') || document.body;
  main.innerHTML = `<div class="card admin-lock"><h2>Area riservata</h2><p class="muted">Inserisci la password per accedere alla gestione del torneo.</p><div class="formline"><label>Password</label><input id="adminPassword" type="password" autocomplete="current-password" placeholder="Password admin"><button id="adminLogin" class="btn primary">Entra</button></div><p id="adminLoginMsg" class="muted"></p></div>`;
  const input = document.querySelector('#adminPassword');
  const btn = document.querySelector('#adminLogin');
  const msg = document.querySelector('#adminLoginMsg');
  const login = () => {
    if(input.value === ADMIN_PASSWORD){ sessionStorage.setItem("smef_admin_unlocked","1"); location.reload(); }
    else { msg.textContent = "Password errata."; input.value = ""; input.focus(); }
  };
  btn.addEventListener('click', login);
  input.addEventListener('keydown', e => { if(e.key === 'Enter') login(); });
  setTimeout(() => input.focus(), 50);
  return false;
}

export function nav(){
  return `<div class="nav"><a href="index.html">Home</a><a href="calendario.html">Calendario</a><a href="turni.html">Turni e risultati</a><a href="classifica.html">Classifica</a><a href="playoff.html">Playoff</a></div>`;
}
export function renderTop(title, subtitle=""){
  document.body.insertAdjacentHTML("afterbegin", `<div class="wrap"><div class="top"><div class="brand"><h1>${title}</h1><p>${subtitle}</p></div>${nav()}</div><main id="app"></main></div>`);
}
