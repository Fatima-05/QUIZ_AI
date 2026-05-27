export const OPTIONS = ['A', 'B', 'C', 'D'];

export function letterGrade(pct) {
  if (pct >= 85) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 65) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

/**
 * 
 * @param {{part1:Array,part2:Array}} answers  
 * @param {{part1:Array,part2:Array}} key       
 * @param {{marksPerQuestion?:number, negativeMarking?:number}} opts
 * @returns 
 */
export function gradeQuiz(answers, key, opts = {}) {
  const marks = Number(opts.marksPerQuestion) || 1;
  const negative = Number(opts.negativeMarking) || 0;

  let correct = 0, incorrect = 0, unattempted = 0, score = 0;
  const flags = [];
  const perQuestion = [];

  for (const part of ['part1', 'part2']) {
    const keyArr = key[part] || [];
    const ansArr = answers[part] || [];
    keyArr.forEach((correctAns, i) => {
      const chosen = ansArr[i] ?? null;
      let status;
      if (chosen === 'X') {
        status = 'invalid';
        incorrect += 1;
        score -= negative;
        flags.push(`${part === 'part1' ? 'P1' : 'P2'}-Q${i + 1}: multiple marks`);
      } else if (chosen == null) {
        status = 'unattempted';
        unattempted += 1;
      } else if (chosen === correctAns) {
        status = 'correct';
        correct += 1;
        score += marks;
      } else {
        status = 'incorrect';
        incorrect += 1;
        score -= negative;
      }
      perQuestion.push({ part, q: i + 1, chosen: chosen === 'X' ? 'multi' : chosen, correct: correctAns, status });
    });
  }

  const numQuestions = (key.part1?.length || 0) + (key.part2?.length || 0);
  const maxMarks = numQuestions * marks;
  const totalMarks = Math.max(0, Math.round(score * 100) / 100);
  const percentage = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

  return {
    correct, incorrect, unattempted,
    totalMarks, maxMarks, percentage,
    grade: letterGrade(percentage),
    flags, perQuestion,
  };
}
