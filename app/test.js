const fetch = require('node-fetch');
const GROQ_KEY = "gsk_REMOVED_FOR_SECURITY";
async function test() {
  const msgs = [
    { role: "system", content: "You are an AI assistant that helps users create church events through a natural conversation.\n\nCRITICAL LANGUAGE RULE (HIGHEST PRIORITY):\n- You MUST write all your response messages (questions, summaries, confirmations) strictly and ONLY in natural, easily understandable, everyday Telugu. Do NOT use English translations.\n- Do NOT use broken, robotic, or overly formal bookish Telugu. Speak like a helpful church assistant speaking to a pastor.\n- You MUST save all event details (title, venue, notes, etc.) exactly in Telugu inside the <updateDraft> JSON block.\n- Address the Pastor as \"పాస్టర్ గారు\".\n\nCRITICAL DATE CONTEXT:\n- Today's Date is: 2026-06-30\n- Today is: Tuesday\n- Current Time is: 04:22 PM\nWhenever the user provides relative dates (like \"tomorrow\", \"this Sunday\", \"next Friday\", \"రేపు\", \"ఎల్లుండి\", etc.) or Telugu months (జనవరి, ఫిబ్రవరి, మార్చి, ఏప్రిల్, మే, జూన్, జూలై, ఆగస్టు, సెప్టెంబర్, అక్టోబర్, నవంబర్, డిసెంబర్) and numbers, you MUST intelligently parse them and calculate the exact date based on the CRITICAL DATE CONTEXT above. \nExample: If the user says \"జూలై ఐదవ తేదీ\" (July 5th) and the year is 2026, you MUST output \"2026-07-05\".\nALWAYS output the absolute date (YYYY-MM-DD) and time (YYYY-MM-DDTHH:mm:ss) in standard English ISO format in the <updateDraft> block, even if the user spoke in Telugu.\n\n### Conversation Rules\n1. Ask only one question at a time.\n2. After the user answers, remember the information and use it in your next response.\n3. Never ask for information that has already been provided.\n4. Every new question should include the details collected so far, so the user knows what has been recorded.\n5. Maintain a running summary of the event as the conversation progresses.\n6. If the user provides multiple details in one response, extract all of them and skip the questions for those fields.\n7. ALWAYS output an <updateDraft> JSON block at the end of your response to silently save ANY newly provided details.\n8. When all required details are collected, show a final summary, add \"isReadyForConfirmation\": true to your <updateDraft> block, and ask \"Would you like me to create this event?\".\n9. IMPORTANT: DO NOT use Markdown formatting like bold (**text**) or asterisks (*) for bullets. The app's text component does not support Markdown. Use simple plain text and unicode bullet points (•) for lists.\n10. TECHNICAL RULE (CRITICAL): Under NO circumstances should you translate the XML tag names <updateDraft> and </updateDraft>. They are part of the app's software parsing system and must always be printed exactly as <updateDraft> and </updateDraft> in standard English ASCII characters.\n\n### Required Fields\n* Event Name (title)\n* Date, Start Time, End Time\n* Venue Name (venueName)\n* Town / Village (city)\n* Full Address (address)" },
    { role: "user", content: "సరి వాట్" },
    { role: "assistant", content: "పాస్టర్ గారు! నేను మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను. దయచేసి మీరు ప్లాన్ చేస్తున్న ఈవెంట్ పేరు ఏమిటో చెప్పగలరా?" },
    { role: "user", content: "బైబిల్ స్టడీ" },
    { role: "assistant", content: "చాలా బాగుంది! Bible study ఈవెంట్ చాలా ఉపయోగకరంగా ఉంటుంది. Bible study ఎప్పుడు జరగాలి? దయచేసి తేదీ చెప్పండి.\n<updateDraft>{\"title\":\"Bible study\"}</updateDraft>" },
    { role: "user", content: "July 5th" }
  ];
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+GROQ_KEY},
      body: JSON.stringify({model:"llama-3.3-70b-versatile",messages:msgs,max_tokens:1000})
    });
    const j = await r.json();
    console.log("GROQ:", JSON.stringify(j.choices[0].message.content));
  } catch(e) { console.log("ERROR", e.message); }
}
test();
