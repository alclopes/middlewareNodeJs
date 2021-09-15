const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

// Verifica se o username do header existe e inclui no request
function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const user = users.find((user) => user.username === username);

  if (!user) {
    return response.status(404).json({ error: "User not exist!" });
  }

  request.user = user;

  next();
}

// permite incluir até 10 todos no plano grátis.
// permite incluir se estiver no plano pro ativado
function checksCreateTodosUserAvailability(request, response, next) {
  const user = request.user;

  if (user.todos.length >= 10 && !user.pro) {
    return response
      .status(403)
      .json({ error: "Number of Todos for plan free is full" });
  }

  return next();
}

// Valida se o todo passado existe e se é valido
function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  const user = users.find((user) => user.username === username);

  if (!user) {
    return response.status(404).json({ error: "User not found" });
  }

  if (!validate(id)) {
    return response.status(400).json({ error: "Id isn't valid UUID" });
  }
  const todo = user.todos.find((todo) => todo.id === id);

  if (!todo) {
    return response.status(404).json({ error: "Todo not found" });
  }

  request.user = user;
  request.todo = todo;

  next();
}

// encontra usuário por id
function findUserById(request, response, next) {
  const { id } = request.params;

  const user = users.find((user) => user.id === id);

  if (!user) {
    return response.status(404).json({ error: "User for that id not found" });
  }

  request.user = user;
  next();
}

// Cria um usuário
app.post("/users", (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return response.status(201).json(user);
});

// retornando json com todos os usuários - ok
app.get("/users", (request, response) => {
  return response.json(users);
});

// retornando usuario por Id - ok
app.get("/users/:id", findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

// atualizando user para pro - Ok
app.patch("/users/:id/pro", findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return response.json(user);
});

// retornando todos de um usuário - ok
app.get("/todos", checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

// criando todo para um usuário - ok
app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
  }
);

// alterando todo para um usuário  - 0k
app.put("/todos/:id", checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

// Altera um todo para done - Ok
app.patch("/todos/:id/done", checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

// deleta um todo de um usuário
app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return response.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
