/* blog-demka: клиентская логика для index.html, posts.html и post.html.
   Важно: авторизация и данные демонстрационные, хранятся только в localStorage. */
(() => {
  "use strict";

  const STORAGE_KEYS = {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
    USER_EMAIL: "user_email"
  };
  const POSTS_KEY = "mock_posts";
  const $ = (id) => document.getElementById(id);

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error("Не удалось прочитать localStorage:", error);
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error("Не удалось сохранить данные:", error);
      return false;
    }
  }

  function storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error("Не удалось удалить данные:", error);
    }
  }

  function isAuthenticated() {
    return Boolean(storageGet(STORAGE_KEYS.ACCESS_TOKEN));
  }

  function clearSession() {
    Object.values(STORAGE_KEYS).forEach(storageRemove);
  }

  function getPosts() {
    try {
      const raw = storageGet(POSTS_KEY);
      const posts = raw ? JSON.parse(raw) : [];
      return Array.isArray(posts) ? posts : [];
    } catch (error) {
      console.error("Не удалось прочитать список постов:", error);
      return [];
    }
  }

  function setPosts(posts) {
    return storageSet(POSTS_KEY, JSON.stringify(posts));
  }

  function showMessage(element, text, type = "info", timeout = 5000) {
    if (!element) return;
    element.textContent = text;
    element.className = `message ${type}`;
    window.clearTimeout(element._hideTimer);
    if (timeout > 0) {
      element._hideTimer = window.setTimeout(() => {
        element.className = "message";
        element.textContent = "";
      }, timeout);
    }
  }

  function hideMessage(element) {
    if (!element) return;
    window.clearTimeout(element._hideTimer);
    element.className = "message";
    element.textContent = "";
  }

  function setButtonLoading(button, loading, idleText) {
    if (!button) return;
    button.disabled = loading;
    if (loading) {
      button.innerHTML = '<span class="loading" aria-hidden="true"></span> Загрузка...';
    } else {
      button.textContent = idleText;
    }
  }

  function formatDate(value, options = {}) {
    if (!value) return "Недавно";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Недавно";
    return date.toLocaleString("ru-RU", options);
  }

  function seedPosts() {
    if (storageGet(POSTS_KEY) !== null) return;
    const now = Date.now();
    const initialPosts = [
      {
        id: 1,
        title: "Добро пожаловать в блог",
        content: "Это демо-пост без backend. Данные хранятся в localStorage вашего браузера.\n\nПопробуйте создать собственную публикацию, оставить комментарий или получить выжимку текста.",
        author: "admin",
        created_at: new Date(now - 86400000 * 3).toISOString(),
        comments: [{
          author: "guest",
          comment_content: "Отличный старт!",
          created_at: new Date(now - 86400000 * 2).toISOString()
        }]
      },
      {
        id: 2,
        title: "Как работает статический блог",
        content: "Страницы posts.html и post.html читают данные из localStorage.\n\nПереход к публикации выполняется через параметр ?post=<id>. Благодаря этому проект можно разместить на GitHub Pages без серверных маршрутов.",
        author: "admin",
        created_at: new Date(now - 86400000).toISOString(),
        comments: []
      }
    ];
    if (!setPosts(initialPosts)) {
      console.warn("Начальные публикации не удалось сохранить.");
    }
  }

  // ------------------------------ index.html ------------------------------
  function setupLoginPage() {
    if (isAuthenticated()) {
      window.location.replace("posts.html");
      return;
    }

    const tabsContainer = $("tabsContainer");
    const loginPanel = $("loginForm");
    const registerPanel = $("registerForm");
    const loginForm = $("loginFormElement");
    const registerForm = $("registerFormElement");
    const message = $("message");

    function switchTab(tab) {
      const showLogin = tab === "login";
      loginPanel?.classList.toggle("active", showLogin);
      registerPanel?.classList.toggle("active", !showLogin);
      tabsContainer?.querySelectorAll("[data-auth-tab]").forEach((button) => {
        const active = button.dataset.authTab === tab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      hideMessage(message);
    }

    tabsContainer?.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.authTab));
    });

    loginForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      hideMessage(message);
      if (!loginForm.reportValidity()) return;

      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value;
      if (password.length < 4) {
        showMessage(message, "Пароль должен содержать не менее 4 символов (демо-проверка).", "error");
        return;
      }

      const button = $("loginBtn");
      setButtonLoading(button, true, "Войти");
      window.setTimeout(() => {
        const token = `demo-token-${Date.now()}`;
        const refreshToken = `demo-refresh-${Date.now()}`;
        const saved = storageSet(STORAGE_KEYS.ACCESS_TOKEN, token)
          && storageSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
          && storageSet(STORAGE_KEYS.USER_EMAIL, email);

        if (!saved) {
          clearSession();
          setButtonLoading(button, false, "Войти");
          showMessage(message, "Браузер не разрешил сохранить сессию. Проверьте настройки хранилища.", "error");
          return;
        }
        window.location.href = "posts.html";
      }, 300);
    });

    registerForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      hideMessage(message);
      if (!registerForm.reportValidity()) return;

      const username = $("regUsername").value.trim();
      const email = $("regEmail").value.trim();
      const password = $("regPassword").value;
      const confirmation = $("regConfirmPassword").value;

      if (username.length < 2) {
        showMessage(message, "Имя пользователя должно содержать не менее 2 символов.", "error");
        return;
      }
      if (password.length < 4) {
        showMessage(message, "Пароль должен содержать не менее 4 символов (демо-проверка).", "error");
        return;
      }
      if (password !== confirmation) {
        showMessage(message, "Пароли не совпадают.", "error");
        return;
      }

      const button = $("registerBtn");
      setButtonLoading(button, true, "Создать аккаунт");
      window.setTimeout(() => {
        const token = `demo-token-${Date.now()}`;
        const refreshToken = `demo-refresh-${Date.now()}`;
        const saved = storageSet(STORAGE_KEYS.ACCESS_TOKEN, token)
          && storageSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
          && storageSet(STORAGE_KEYS.USER_EMAIL, email);

        if (!saved) {
          clearSession();
          setButtonLoading(button, false, "Создать аккаунт");
          showMessage(message, "Не удалось сохранить демонстрационную сессию.", "error");
          return;
        }
        showMessage(message, `Аккаунт для ${username} создан в демо-режиме.`, "success", 1200);
        window.setTimeout(() => { window.location.href = "posts.html"; }, 700);
      }, 300);
    });

    // Dynamic content: the cards are created from data rather than hard-coded HTML.
    const projects = [
      {
        title: "Публикации",
        description: "Создание записей, просмотр списка и открытие отдельной страницы поста.",
        tag: "Блог"
      },
      {
        title: "Комментарии",
        description: "Добавление комментариев к публикациям с сохранением в браузере.",
        tag: "Общение"
      },
      {
        title: "Выжимка текста",
        description: "Демонстрационное сокращение текста до первых двух предложений.",
        tag: "JavaScript"
      }
    ];

    const projectList = $("projectsList");
    if (projectList) {
      projectList.replaceChildren();
      projects.forEach((project) => {
        const card = document.createElement("article");
        card.className = "project-card";

        const heading = document.createElement("h3");
        heading.textContent = project.title;

        const description = document.createElement("p");
        description.textContent = project.description;

        const tag = document.createElement("span");
        tag.className = "project-tag";
        tag.textContent = project.tag;

        card.append(heading, description, tag);
        projectList.append(card);
      });
    }

    // Contact form: validate locally, do not pretend to send data to a server.
    const contactForm = $("contactForm");
    const contactMessage = $("contactMessage");
    contactForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      contactMessage.className = "contact-message";
      contactMessage.textContent = "";

      const name = $("contactName")?.value.trim() || "";
      const email = $("contactEmail")?.value.trim() || "";
      const messageText = $("contactMessageText")?.value.trim() || "";

      if (!contactForm.checkValidity() || name.length < 2 || !email || messageText.length < 10) {
        contactForm.reportValidity();
        contactMessage.textContent = "Проверьте поля: имя — минимум 2 символа, корректный email, сообщение — минимум 10 символов.";
        contactMessage.className = "contact-message error";
        return;
      }

      contactMessage.textContent = `Спасибо, ${name}! Проверка пройдена. Это демонстрационная форма: сообщение не отправлено на сервер.`;
      contactMessage.className = "contact-message success";
      contactForm.reset();
    });

    // Bootstrap Collapse changes the button label when the details panel opens/closes.
    const details = $("moreText");
    const detailsButton = $("showMore");
    details?.addEventListener("shown.bs.collapse", () => {
      if (detailsButton) detailsButton.textContent = "Скрыть";
    });
    details?.addEventListener("hidden.bs.collapse", () => {
      if (detailsButton) detailsButton.textContent = "Подробнее";
    });

    // Резервная реализация Collapse: страница остаётся интерактивной,
    // даже если Bootstrap CDN заблокирован или недоступен.
    if (details && detailsButton && !(window.bootstrap && window.bootstrap.Collapse)) {
      detailsButton.addEventListener("click", () => {
        const isOpen = details.classList.toggle("show");
        detailsButton.setAttribute("aria-expanded", String(isOpen));
        detailsButton.textContent = isOpen ? "Скрыть" : "Подробнее";
      });
    }
  }

  // ------------------------------ posts.html ------------------------------
  function setupPostsPage() {
    if (!isAuthenticated()) {
      window.location.replace("index.html");
      return;
    }

    const userEmail = $("userEmail");
    const list = $("postsList");
    const loading = $("loadingState");
    const empty = $("emptyState");
    const message = $("message");
    const modal = $("createModal");
    const form = $("createPostForm");
    const createButton = $("createPostBtn");
    const cancelButton = $("cancelPostBtn");
    const titleInput = $("postTitle");

    if (userEmail) {
      userEmail.textContent = storageGet(STORAGE_KEYS.USER_EMAIL) || "Пользователь";
    }

    function closeModal() {
      modal?.classList.remove("active");
      modal?.setAttribute("aria-hidden", "true");
      if (createButton) createButton.focus();
    }

    function openModal() {
      if (!isAuthenticated()) {
        showMessage(message, "Войдите, чтобы создать публикацию.", "error");
        return;
      }
      hideMessage(message);
      form?.reset();
      modal?.classList.add("active");
      modal?.setAttribute("aria-hidden", "false");
      window.setTimeout(() => titleInput?.focus(), 0);
    }

    function renderPosts() {
      if (!list || !loading || !empty) return;

      const posts = getPosts().slice().sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      list.replaceChildren();
      loading.classList.add("hidden");

      if (posts.length === 0) {
        list.classList.add("hidden");
        empty.classList.remove("hidden");
        return;
      }

      posts.forEach((post) => {
        const link = document.createElement("a");
        link.className = "post-card";
        link.href = `post.html?post=${encodeURIComponent(String(post.id))}`;
        link.style.textDecoration = "none";
        link.setAttribute("aria-label", `Открыть публикацию: ${post.title || "Без названия"}`);

        const heading = document.createElement("div");
        heading.className = "post-title";
        heading.textContent = post.title || "Без названия";

        const author = document.createElement("div");
        author.className = "post-author";
        const authorName = document.createElement("strong");
        authorName.textContent = post.author || "Автор";
        author.append(authorName);

        const meta = document.createElement("div");
        meta.className = "post-meta";
        const date = document.createElement("span");
        date.textContent = `📅 ${formatDate(post.created_at, { year: "numeric", month: "short", day: "numeric" })}`;
        const count = document.createElement("span");
        count.textContent = `💬 ${(Array.isArray(post.comments) ? post.comments.length : 0)}`;
        meta.append(date, count);

        link.append(heading, author, meta);
        list.append(link);
      });

      list.classList.remove("hidden");
      empty.classList.add("hidden");
    }

    createButton?.addEventListener("click", openModal);
    cancelButton?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal?.classList.contains("active")) closeModal();
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      hideMessage(message);

      if (!form.reportValidity()) return;
      const title = titleInput.value.trim();
      const content = $("postContent").value.trim();

      if (!title || !content) {
        showMessage(message, "Заполните заголовок и содержание публикации.", "error");
        return;
      }

      const posts = getPosts();
      const nextId = posts.reduce((max, post) => Math.max(max, Number(post.id) || 0), 0) + 1;
      posts.push({
        id: nextId,
        title,
        content,
        author: storageGet(STORAGE_KEYS.USER_EMAIL) || "user",
        created_at: new Date().toISOString(),
        comments: []
      });

      if (!setPosts(posts)) {
        showMessage(message, "Не удалось сохранить публикацию в браузере.", "error");
        return;
      }

      closeModal();
      renderPosts();
      showMessage(message, "Публикация создана и сохранена в этом браузере.", "success");
    });

    $("logoutBtn")?.addEventListener("click", () => {
      if (window.confirm("Выйти из демонстрационного аккаунта?")) {
        clearSession();
        window.location.href = "index.html";
      }
    });

    seedPosts();
    renderPosts();
  }

  // ------------------------------ post.html ------------------------------
  function setupPostPage() {
    if (!isAuthenticated()) {
      window.location.replace("index.html");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const postId = Number(params.get("post"));
    const message = $("message");
    const postContent = $("postContent");
    const loading = $("loadingState");
    const empty = $("emptyState");
    const commentsList = $("commentsList");
    const commentInput = $("commentInput");

    $("userEmail").textContent = storageGet(STORAGE_KEYS.USER_EMAIL) || "Пользователь";

    function getPost() {
      if (!Number.isInteger(postId) || postId < 1) return null;
      return getPosts().find((post) => Number(post.id) === postId) || null;
    }

    function renderComments(comments) {
      if (!commentsList) return;
      commentsList.replaceChildren();

      if (!comments.length) {
        const emptyText = document.createElement("div");
        emptyText.style.cssText = "padding:16px 0;color:#999;font-size:14px;text-align:center;";
        emptyText.textContent = "Пока нет комментариев. Будьте первым!";
        commentsList.append(emptyText);
      } else {
        comments.forEach((comment) => {
          const item = document.createElement("article");
          item.className = "comment-item";

          const content = document.createElement("div");
          content.className = "comment-content";
          content.textContent = comment.comment_content || "";

          const meta = document.createElement("div");
          meta.className = "comment-meta";
          const author = comment.author ? `👤 ${comment.author}` : "";
          const date = comment.created_at ? ` · ${formatDate(comment.created_at)}` : "";
          meta.textContent = `${author}${date}`;

          item.append(content, meta);
          commentsList.append(item);
        });
      }

      const count = $("commentsCount");
      if (count) count.textContent = String(comments.length);
    }

    function renderPost() {
      const post = getPost();
      loading?.classList.add("hidden");

      if (!post) {
        empty?.classList.remove("hidden");
        return;
      }

      $("postTitle").textContent = post.title || "Без названия";
      $("postAuthor").textContent = post.author || "Автор";
      $("postDate").textContent = formatDate(post.created_at, {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      $("postBody").textContent = post.content || "";
      renderComments(Array.isArray(post.comments) ? post.comments : []);
      postContent?.classList.remove("hidden");
    }

    function sendComment() {
      const text = commentInput?.value.trim() || "";
      if (!text) {
        showMessage(message, "Напишите комментарий перед отправкой.", "error");
        commentInput?.focus();
        return;
      }

      const posts = getPosts();
      const index = posts.findIndex((post) => Number(post.id) === postId);
      if (index === -1) {
        showMessage(message, "Публикация не найдена.", "error");
        return;
      }

      if (!Array.isArray(posts[index].comments)) posts[index].comments = [];
      posts[index].comments.push({
        author: storageGet(STORAGE_KEYS.USER_EMAIL) || "guest",
        comment_content: text,
        created_at: new Date().toISOString()
      });

      if (!setPosts(posts)) {
        showMessage(message, "Не удалось сохранить комментарий.", "error");
        return;
      }

      commentInput.value = "";
      renderComments(posts[index].comments);
      showMessage(message, "Комментарий добавлен.", "success");
    }

    function makeSummary(text) {
      const clean = String(text || "").replace(/\s+/g, " ").trim();
      if (!clean) return "Текст пуст — нечего сокращать.";
      const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
      const firstSentences = sentences.slice(0, 2).join(" ");
      return `Выжимка (демо): ${firstSentences}${sentences.length > 2 ? " …" : ""}\n\nСимволов: ${clean.length}, предложений: ${sentences.length}.`;
    }

    function summarize() {
      const button = $("summarizeBtn");
      const output = $("summarizeContent");
      const post = getPost();
      if (!post || !button || !output || button.disabled) return;

      button.disabled = true;
      button.textContent = "⏳ Загрузка...";
      output.classList.add("active");
      output.replaceChildren();

      const loadingLabel = document.createElement("span");
      loadingLabel.className = "loading-text";
      loadingLabel.textContent = "Подготовка выжимки...";
      output.append(loadingLabel);

      window.setTimeout(() => {
        try {
          const result = document.createElement("div");
          result.className = "summary-text";
          result.textContent = makeSummary(post.content);
          output.replaceChildren(result);
          showMessage(message, "Выжимка подготовлена.", "success");
        } catch (error) {
          console.error("Ошибка подготовки выжимки:", error);
          const errorText = document.createElement("div");
          errorText.className = "summary-error";
          errorText.textContent = "Не удалось подготовить выжимку.";
          output.replaceChildren(errorText);
        } finally {
          button.disabled = false;
          button.textContent = "Получить выжимку";
        }
      }, 450);
    }

    $("sendCommentBtn")?.addEventListener("click", sendComment);
    commentInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendComment();
      }
    });
    $("summarizeBtn")?.addEventListener("click", summarize);
    $("logoutBtn")?.addEventListener("click", () => {
      if (window.confirm("Выйти из демонстрационного аккаунта?")) {
        clearSession();
        window.location.href = "index.html";
      }
    });

    if (!Number.isInteger(postId) || postId < 1) {
      window.location.replace("posts.html");
      return;
    }
    renderPost();
  }

  // Run only the controller belonging to the current page.
  const page = document.body?.dataset.page;
  if (page === "login") setupLoginPage();
  if (page === "posts") setupPostsPage();
  if (page === "post") setupPostPage();
})();
