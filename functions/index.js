const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const OpenAI = require("openai");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function containsBlockedRequest(text=""){
  const t = String(text).toLowerCase();
  return [
    "risposta esatta", "risposta corretta", "quale opzione", "scegli", "dimmi la risposta",
    "soluzione del quiz", "soluzione esame", "opzione a", "opzione b", "opzione c",
    "test", "simulazione"
  ].some(x => t.includes(x));
}

exports.tutorAi = onRequest({region:"europe-west1", secrets:[OPENAI_API_KEY]}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({error:"Metodo non consentito"});

  const {question, lesson} = req.body || {};
  if (!question || !lesson) return res.status(400).json({error:"Domanda o lezione mancante"});

  if (containsBlockedRequest(question)) {
    return res.json({answer:"Non posso dare risposte a quiz o simulazioni. Posso però spiegarti l'argomento, fare un esempio simile o allenarti all'orale senza indicare l'opzione corretta."});
  }

  const client = new OpenAI({apiKey: OPENAI_API_KEY.value()});
  const system = `Sei un tutor di Informatica per Arianna, studentessa di prima superiore dell'Istituto Tecnico Agrario.
Spiega in italiano semplice, con tono paziente e concreto.
La studentessa parte quasi da zero: usa frasi brevi, esempi pratici e mappe mentali.
Regola obbligatoria: non dare mai risposte ai quiz, non indicare opzioni A/B/C, non risolvere simulazioni d'esame.
Se la richiesta sembra chiedere la risposta di un test, rifiuta brevemente e offri una spiegazione del concetto.`;

  const lessonText = `Titolo: ${lesson.title}\nArea: ${lesson.area}\nObiettivo: ${lesson.goal}\nTeoria: ${(lesson.theory||[]).join(" | ")}\nDettagli: ${(lesson.detail||[]).join(" | ")}\nMappa: ${(lesson.map||[]).join(" -> ")}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      {role:"system", content: system},
      {role:"user", content: `Lezione corrente:\n${lessonText}\n\nDomanda della studentessa:\n${question}`}
    ]
  });

  res.json({answer: completion.choices?.[0]?.message?.content || "Non sono riuscito a rispondere."});
});
