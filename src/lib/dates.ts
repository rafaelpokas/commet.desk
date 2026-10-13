export const currentCompetence = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0,7);
export function localDateTimeToIso(input: string, timeZone: string): string {
  const target = new Date(`${input}:00Z`).getTime();
  if (!Number.isFinite(target)) throw new Error('Data inválida.');
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' });
  for (let i=0;i<3;i++) {
    const p = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
    const shown = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    if (shown === target) return new Date(instant).toISOString();
    instant += target-shown;
  }
  throw new Error('Este horário não existe no fuso do cliente. Escolha outro horário.');
}
