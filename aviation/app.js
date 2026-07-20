const filterNames = ["Все", "Исследовать", "Конструировать", "Программировать", "Собирать", "Моделировать", "Анализировать", "Планировать"];
    const state = JSON.parse(localStorage.getItem("aviation-interest-map") || "{}");
    let activeFilter = "Все";

    const cardsEl = document.getElementById("cards");
    const filtersEl = document.getElementById("filters");
    const searchEl = document.getElementById("search");
    const yesListEl = document.getElementById("yesList");
    const interpretationEl = document.getElementById("interpretation");
    const progressTextEl = document.getElementById("progressText");
    const progressValueEl = document.getElementById("progressValue");
    const toastEl = document.getElementById("toast");

    function escapeHtml(value) {
      return String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
    }

    function renderFilters() {
      filtersEl.innerHTML = filterNames.map(name => `<button type="button" class="chip ${name === activeFilter ? "active" : ""}" data-filter="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("");
      filtersEl.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        renderFilters();
        applyFilters();
      }));
    }

    function renderCards() {
      cardsEl.innerHTML = directions.map((item, index) => `
        <article class="card" id="card-${item.id}" data-id="${item.id}" data-search="${escapeHtml([item.title,item.summary,...item.tags,...item.filters,item.do,item.task,item.video.title,item.video.channel].join(" ").toLowerCase())}" data-filters="${escapeHtml(item.filters.join("|"))}">
          <button class="card-head" type="button" aria-expanded="false" aria-controls="body-${item.id}">
            <span class="index">${String(index + 1).padStart(2,"0")}</span>
            <span>
              <h3>${escapeHtml(item.title)}</h3>
              <p class="card-summary">${escapeHtml(item.summary)}</p>
              <span class="tags">${item.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</span>
            </span>
            <span class="chevron" aria-hidden="true">⌄</span>
          </button>
          <div class="card-body" id="body-${item.id}">
            <div class="detail-grid">
              <div class="detail"><h4>Чем занимаются</h4><p>${escapeHtml(item.do)}</p></div>
              <div class="detail"><h4>Типичная задача</h4><p>${escapeHtml(item.task)}</p></div>
              <div class="detail"><h4>Может понравиться</h4><ul>${item.like.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></div>
              <div class="detail"><h4>Может утомлять</h4><p>${escapeHtml(item.tire)}</p></div>
              <div class="detail trial"><h4>Мини-проба</h4><p><strong>30–90 минут:</strong> ${escapeHtml(item.trial)}</p></div>
              <section class="video-card" aria-label="Показательный ролик: ${escapeHtml(item.video.title)}">
                <div class="video-heading"><h4>Посмотреть, как это выглядит</h4><span>YouTube</span></div>
                <button class="video-preview" type="button" data-video-id="${item.video.id}" data-video-title="${escapeHtml(item.video.title)}" aria-label="Включить видео: ${escapeHtml(item.video.title)}">
                  <img loading="lazy" src="https://i.ytimg.com/vi/${item.video.id}/hqdefault.jpg" alt="Превью видео: ${escapeHtml(item.video.title)}">
                  <span class="video-play" aria-hidden="true">▶</span>
                </button>
                <div class="video-copy">
                  <p class="video-title">${escapeHtml(item.video.title)}</p>
                  <p class="video-channel">Канал: ${escapeHtml(item.video.channel)}</p>
                  <p class="video-note">${escapeHtml(item.video.note)}</p>
                  <p class="video-watch"><strong>На что смотреть:</strong> ${escapeHtml(item.video.watch)}</p>
                  <a class="video-link" href="https://www.youtube.com/watch?v=${item.video.id}" target="_blank" rel="noopener noreferrer">Открыть на YouTube ↗</a>
                </div>
              </section>
              <p class="video-language">Большинство роликов на английском. Можно смотреть визуально или включить в плеере русские субтитры и автоперевод.</p>
            </div>
            <div class="rating" aria-label="Оценить направление ${escapeHtml(item.title)}">
              <button type="button" data-value="yes">Хочу попробовать</button>
              <button type="button" data-value="maybe">Пока не знаю</button>
              <button type="button" data-value="no">Скорее не моё</button>
            </div>
          </div>
        </article>
      `).join("");

      cardsEl.querySelectorAll(".card").forEach(card => {
        const head = card.querySelector(".card-head");
        head.addEventListener("click", () => {
          const open = card.classList.toggle("open");
          head.setAttribute("aria-expanded", String(open));
        });
        const videoPreview = card.querySelector(".video-preview");
        videoPreview.addEventListener("click", () => {
          const videoId = videoPreview.dataset.videoId;
          const videoTitle = videoPreview.dataset.videoTitle;
          const frame = document.createElement("div");
          frame.className = "video-frame";
          frame.innerHTML = `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0" title="${escapeHtml(videoTitle)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
          videoPreview.replaceWith(frame);
        }, { once: true });
        card.querySelectorAll(".rating button").forEach(button => {
          if (state[card.dataset.id] === button.dataset.value) button.classList.add("selected");
          button.addEventListener("click", () => {
            const id = card.dataset.id;
            const value = button.dataset.value;
            if (state[id] === value) delete state[id]; else state[id] = value;
            localStorage.setItem("aviation-interest-map", JSON.stringify(state));
            card.querySelectorAll(".rating button").forEach(item => item.classList.toggle("selected", state[id] === item.dataset.value));
            updateResults();
          });
        });
      });
    }

    function applyFilters() {
      const query = searchEl.value.trim().toLowerCase();
      cardsEl.querySelectorAll(".card").forEach(card => {
        const filterMatch = activeFilter === "Все" || card.dataset.filters.split("|").includes(activeFilter);
        const searchMatch = !query || card.dataset.search.includes(query);
        card.classList.toggle("hidden", !(filterMatch && searchMatch));
      });
    }

    function getInterpretation(selected) {
      if (!selected.length) return "Начните с чтения нескольких карточек. Отмечать можно постепенно — выбор сохранится в этом браузере.";
      const counts = {};
      selected.forEach(item => item.filters.forEach(filter => counts[filter] = (counts[filter] || 0) + 1));
      const top = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,3).map(([name]) => name.toLowerCase());
      const mix = top.length > 1 ? `${top.slice(0,-1).join(", ")} и ${top.at(-1)}` : top[0];
      return `Сейчас особенно заметен интерес к занятиям «${mix}». Это не вывод о профессии: выберите две разные мини-пробы из отмеченных направлений и сравните, хочется ли продолжить после практики.`;
    }

    function updateResults() {
      const selected = directions.filter(item => state[item.id] === "yes");
      const answered = Object.keys(state).filter(id => directions.some(item => item.id === id)).length;
      progressTextEl.textContent = `${answered} из ${directions.length}`;
      progressValueEl.style.width = `${answered / directions.length * 100}%`;
      yesListEl.innerHTML = selected.length
        ? selected.map(item => `<span class="result-pill">${escapeHtml(item.title)}</span>`).join("")
        : `<span class="empty">Пока ничего не отмечено.</span>`;
      interpretationEl.textContent = getInterpretation(selected);
    }

    function showToast(text) {
      toastEl.textContent = text;
      toastEl.classList.add("show");
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => toastEl.classList.remove("show"), 1800);
    }

    document.getElementById("copyResult").addEventListener("click", async () => {
      const yes = directions.filter(item => state[item.id] === "yes").map(item => item.title);
      const maybe = directions.filter(item => state[item.id] === "maybe").map(item => item.title);
      const no = directions.filter(item => state[item.id] === "no").map(item => item.title);
      const text = [
        "Моя карта интересов в авиации",
        "",
        `Хочу попробовать: ${yes.length ? yes.join(", ") : "пока не выбрано"}`,
        `Пока не знаю: ${maybe.length ? maybe.join(", ") : "—"}`,
        `Скорее не моё: ${no.length ? no.join(", ") : "—"}`,
        "",
        interpretationEl.textContent
      ].join("\n");
      try {
        await navigator.clipboard.writeText(text);
        showToast("Результат скопирован");
      } catch {
        showToast("Не удалось скопировать автоматически");
      }
    });

    document.getElementById("resetResult").addEventListener("click", () => {
      Object.keys(state).forEach(key => delete state[key]);
      localStorage.removeItem("aviation-interest-map");
      document.querySelectorAll(".rating button").forEach(button => button.classList.remove("selected"));
      updateResults();
      showToast("Отметки сброшены");
    });

    searchEl.addEventListener("input", applyFilters);
    renderFilters();
    renderCards();
    updateResults();
