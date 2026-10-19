const readline = require('readline');
const allQuestions = require('./questions');

const TIME_LIMIT = 15; 

function ask(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function askWithTimeout(rl, prompt, seconds) {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ timedOut: true, answer: null });
    }, seconds * 1000);

    rl.question(prompt, (answer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ timedOut: false, answer: answer.trim() });
    });
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prepareQuestion(q) {
  const correctChoice = q.choices[q.answer];
  const shuffled = shuffle(q.choices);
  return {
    ...q,
    choices: shuffled,
    answer: shuffled.indexOf(correctChoice)
  };
}

//Ask one question with a countdown. Returns the chosen index,
//or null if the timer ran out.

async function askQuestion(rl, q, number, total) {
  console.log(`\n[${number}/${total}] ${q.question}`);
  q.choices.forEach((choice, i) => console.log(`  ${i + 1}) ${choice}`));

  const start = Date.now();
  const prompt = `Your answer (1-${q.choices.length}) — ${TIME_LIMIT}s: `;

  while (true) {
    const remaining = TIME_LIMIT - (Date.now() - start) / 1000;
    if (remaining <= 0) return null;

    const { timedOut, answer } = await askWithTimeout(rl, prompt, remaining);
    if (timedOut) {
      console.log('\n  Time up!');
      return null;
    }

    const num = Number(answer);
    if (Number.isInteger(num) && num >= 1 && num <= q.choices.length) {
      return num - 1;
    }
    console.log(`  Please enter a number between 1 and ${q.choices.length}.`);
  }
}

async function runQuiz(rl, questions) {
  let score = 0;
  let timedOut = 0;
  let i = 0;

  for (const q of questions) {
    i++;
    const chosen = await askQuestion(rl, q, i, questions.length);

    if (chosen === null) {
      timedOut++;
      console.log(`  No answer. Correct was: ${q.choices[q.answer]}`);
    } else if (chosen === q.answer) {
      score++;
      console.log('  Correct!');
    } else {
      console.log(`  Wrong. The answer is: ${q.choices[q.answer]}`);
    }
    console.log(`  ${q.explanation}`);
  }

  console.log(`🏁 Final score: ${score}/${questions.length}`);
  if (timedOut > 0) console.log(`Timed out on: ${timedOut} question(s)`);
  return score;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    while (true) {
      console.log('HISTORY QUIZ (timed)');
      console.log(`You have ${TIME_LIMIT} seconds per question.`);

      const batch = shuffle(allQuestions).map(prepareQuestion);
      await runQuiz(rl, batch);

      const again = await ask(rl, '\nPlay again? (y/n): ');
      if (!/^y/i.test(again)) break;
    }
    console.log('\nThanks for playing!');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});