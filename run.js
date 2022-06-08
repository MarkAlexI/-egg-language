//PARSER//
function parseExpression(program) {
  program = skipSpace(program);
  let match, expr;
  if ((match = /^"([^"]*)"/.exec(program)))
    expr = { type: "value", value: match[1] };
  else if ((match = /^\d+\b/.exec(program)))
    expr = { type: "value", value: Number(match[0]) };
  else if ((match = /^[^\s(),"]+/.exec(program)))
    expr = { type: "word", name: match[0] };
  else throw new SyntaxError("Неожиданный синтаксис: " + program);

  return parseApply(expr, program.slice(match[0].length));
}

function skipSpace(string) {
  string = string.replace(/#.*?\n/, "");
  let first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}

function parseApply(expr, program) {
  program = skipSpace(program);
  if (program[0] != "(") return { expr: expr, rest: program };

  program = skipSpace(program.slice(1));
  expr = { type: "apply", operator: expr, args: [] };
  while (program[0] != ")") {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);
    if (program[0] == ",") program = skipSpace(program.slice(1));
    else if (program[0] != ")") throw new SyntaxError("Ожидается ',' or ')'");
  }
  return parseApply(expr, program.slice(1));
}

function parse(program) {
  let result = parseExpression(program);
  if (skipSpace(result.rest).length > 0)
    throw new SyntaxError("Неожиданный текст после программы");
  return result.expr;
}

function evaluate(expr, env) {
  switch (expr.type) {
    case "value":
      return expr.value;

    case "word":
      if (expr.name in env) return env[expr.name];
      else throw new ReferenceError("Неопределённая переменная: " + expr.name);
    case "apply":
      if (expr.operator.type == "word" && expr.operator.name in specialForms)
        return specialForms[expr.operator.name](expr.args, env);
      let op = evaluate(expr.operator, env);
      if (typeof op != "function")
        throw new TypeError("Приложение не является функцией.");
      return op.apply(
        null,
        expr.args.map(function (arg) {
          return evaluate(arg, env);
        })
      );
  }
}

function run() {
  var env = Object.create(topEnv);
  var program = Array.prototype.slice.call(arguments, 0).join("\n");
  return evaluate(parse(program), env);
}

let specialForms = Object.create(null);

specialForms["if"] = function (args, env) {
  if (args.length != 3)
    throw new SyntaxError("Неправильное количество аргументов для if");

  if (evaluate(args[0], env) !== false) return evaluate(args[1], env);
  else return evaluate(args[2], env);
};

specialForms["while"] = function (args, env) {
  if (args.length != 2)
    throw new SyntaxError("Неправильное количество аргументов для while");

  while (evaluate(args[0], env) !== false) evaluate(args[1], env);

  // Поскольку undefined не задано в Egg,
  // за отсутствием осмысленного результата возвращаем false
  return false;
};

specialForms["do"] = function (args, env) {
  let value = false;
  args.forEach(function (arg) {
    value = evaluate(arg, env);
  });
  return value;
};

specialForms["define"] = function (args, env) {
  if (args.length != 2 || args[0].type != "word")
    throw new SyntaxError("Bad use of define");
  let value = evaluate(args[1], env);
  env[args[0].name] = value;
  return value;
};

specialForms["fun"] = function (args, env) {
  if (!args.length) throw new SyntaxError("Функции нужно тело");
  function name(expr) {
    if (expr.type != "word")
      throw new SyntaxError("Имена аргументов должны быть типа word");
    return expr.name;
  }
  var argNames = args.slice(0, args.length - 1).map(name);
  var body = args[args.length - 1];

  return function () {
    if (arguments.length != argNames.length)
      throw new TypeError("Неверное количество аргументов");
    var localEnv = Object.create(env);
    for (var i = 0; i < arguments.length; i++)
      localEnv[argNames[i]] = arguments[i];
    return evaluate(body, localEnv);
  };
};

let topEnv = Object.create(null);

topEnv["true"] = true;
topEnv["false"] = false;

["+", "-", "*", "/", "==", "<", ">"].forEach(function (op) {
  topEnv[op] = new Function("a, b", "return a " + op + " b;");
});

topEnv["array"] = function () {
  return [...arguments];
};

topEnv["length"] = function (x) {
  return x.length;
};

topEnv["element"] = function (array, i) {
  return array[i];
};

topEnv["print"] = function (value) {
  console.log(value);
  const div = document.getElementById("output");
  const text = div.innerHTML;
  div.innerHTML = text + "<br></br>" + "Result of execution: " + value;
  //return value;
};

run("do(define(total, 0),",
  " define(count, 1),",
  " while(<(count, 11),",
  " do(define(total, +(total, count)),",
  " define(count, +(count, 1)))),",
  " print(total))");

run("do(define(plusOne, fun(a, +(a, 1))),",
  " print(plusOne(10)))");

run("do(define(pow, fun(base, exp,",
  " if(==(exp, 0),",
  " 1,",
  " *(base, pow(base, -(exp, 1)))))),",
  " print(pow(2, 10)))");

run("do(print(element(array(1, 2, 3), 1)))");

run("do(define(sum, fun(array,",
  " do(define(i, 0),",
  " define(sum, 0),",
  " while(<(i, length(array)),",
  " do(define(sum, +(sum, element(array, i))),",
  " define(i, +(i, 1)))),",
  " sum))),",
  " print(sum(array(1, 2, 3))))");

run("do(define(f, fun(a, fun(b, +(a, b)))),",
  " print(f(4)(5)))");

//const tasks = document.getElementById("input").innerText;
//eval(tasks);

/*Do it again!©Appolo440*/
/*  let prog = parse("if(true, false, true)"); 
  console.log(evaluate(prog, topEnv)); // → false

  console.log(JSON.stringify(parse("+(a, 10)")));*/
  // → {type: "apply",
  // operator: {type: "word", name: "+"},
  // args: [{type: "word", name: "a"},=
  // {type: "value", value: 10}]}

//verify exist of comments
//run("do(print('# hello\n1'))");
//print(parse("a # one    # two\n()"));