function parseExpression(program) {
    program = skipSpace(program);
    let match, expr;
    if (match = /^"([^"]*)"/.exec(program))
      expr = {type: "value", value: match[1]};
    else if (match = /^\d+\b/.exec(program))
      expr = {type: "value", value: Number(match[0])};
    else if (match = /^[^\s(),"]+/.exec(program))
      expr = {type: "word", name: match[0]};
    else
      throw new SyntaxError("Неожиданный синтаксис: " + program);
  
    return parseApply(expr, program.slice(match[0].length));
  }
  
  function skipSpace(string) {
    let first = string.search(/\S/);
    if (first == -1) return "";
    return string.slice(first);
  }
  
  function parseApply(expr, program) {
    program = skipSpace(program);
    if (program[0] != "(")
      return {expr: expr, rest: program};
  
    program = skipSpace(program.slice(1));
    expr = {type: "apply", operator: expr, args: []};
    while (program[0] != ")") {
      let arg = parseExpression(program);
      expr.args.push(arg.expr);
      program = skipSpace(arg.rest);
      if (program[0] == ",")
        program = skipSpace(program.slice(1));
      else if (program[0] != ")")
        throw new SyntaxError("Ожидается ',' or ')'");
    }
    return parseApply(expr, program.slice(1));
  }
  
  function parse(program) {
    let result = parseExpression(program);
    if (skipSpace(result.rest).length > 0)
      throw new SyntaxError("Неожиданный текст после программы");
    return result.expr;
  }
  
  console.log(JSON.stringify(parse("+(a, 10)")));
  // → {type: "apply",
  // operator: {type: "word", name: "+"},
  // args: [{type: "word", name: "a"},
  // {type: "value", value: 10}]}
  
  function evaluate(expr, env) {
    switch(expr.type) {
      case "value":
        return expr.value;
  
      case "word":
        if (expr.name in env)
          return env[expr.name];
        else
          throw new ReferenceError("Неопределённая переменная: " +
                                   expr.name);
      case "apply":
        if (expr.operator.type == "word" &&
            expr.operator.name in specialForms)
          return specialForms[expr.operator.name](expr.args,
                                                  env);
        let op = evaluate(expr.operator, env);
        if (typeof op != "function")
          throw new TypeError("Приложение не является функцией.");
        return op.apply(null, expr.args.map(function(arg) {
          return evaluate(arg, env);
        }));
    }
  }
  
  function run() {
    var env = Object.create(topEnv);
    var program = Array.prototype.slice
      .call(arguments, 0).join("\n");
    return evaluate(parse(program), env);
  }

  let specialForms = Object.create(null);
  
  specialForms["if"] = function(args, env) {
    if (args.length != 3)
      throw new SyntaxError("Неправильное количество аргументов для if");
  
    if (evaluate(args[0], env) !== false)
      return evaluate(args[1], env);
    else
      return evaluate(args[2], env);
  };
  
  specialForms["while"] = function(args, env) {
    if (args.length != 2)
      throw new SyntaxError("Неправильное количество аргументов для while");
  
    while (evaluate(args[0], env) !== false)
      evaluate(args[1], env);
  
    // Поскольку undefined не задано в Egg,
    // за отсутствием осмысленного результата возвращаем false
    return false;
  };
  
  specialForms["do"] = function(args, env) {
    let value = false;
    args.forEach(function(arg) {
      value = evaluate(arg, env);
    });
    return value;
  };
  
  specialForms["define"] = function(args, env) {
    if (args.length != 2 || args[0].type != "word")
      throw new SyntaxError("Bad use of define");
    let value = evaluate(args[1], env);
    env[args[0].name] = value;
    return value;
  };
  
  let topEnv = Object.create(null);
  
  topEnv["true"] = true;
  topEnv["false"] = false;
  
  //let prog = parse("if(true, false, true)"); 
  //console.log(evaluate(prog, topEnv)); // → false
  
  ["+", "-", "*", "/", "==", "<", ">"].forEach(function(op) {
    topEnv[op] = new Function("a, b", "return a " + op + " b;");
  });