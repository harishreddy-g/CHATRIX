(function () {
    "use strict";

    const escapeHtml = (value) => String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const post = async (url, body) => {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials: "same-origin",
            body: body ? JSON.stringify(body) : undefined
        });
        if (res.status === 401) { window.location.href = "/login"; throw new Error("unauthenticated"); }
        const data = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || data.ok === false) throw new Error(data.error || "Request failed");
        return data;
    };

    /* ---------- Likes ---------- */
    document.addEventListener("click", async (event) => {
        const likeBtn = event.target.closest(".like-btn");
        if (!likeBtn) return;

        const id = likeBtn.dataset.likeId;
        const icon = likeBtn.querySelector(".like-icon");
        const count = likeBtn.querySelector(".like-count");
        likeBtn.disabled = true;
        try {
            const data = await post(`/posts/${id}/like`);
            likeBtn.classList.toggle("liked", data.liked);
            likeBtn.setAttribute("aria-pressed", String(data.liked));
            icon.textContent = data.liked ? "❤️" : "🤍";
            count.textContent = data.likeCount;
        } catch (err) {
            console.error("Like failed:", err.message);
        } finally {
            likeBtn.disabled = false;
        }
    });

    /* ---------- Follow ---------- */
    document.addEventListener("click", async (event) => {
        const followBtn = event.target.closest(".follow-btn");
        if (!followBtn) return;

        const id = followBtn.dataset.followId;
        followBtn.disabled = true;
        try {
            const data = await post(`/follow/${id}`);
            followBtn.classList.toggle("is-following", data.following);
            followBtn.classList.toggle("btn-secondary", !data.following ? false : followBtn.classList.contains("btn-secondary"));
            followBtn.textContent = data.following ? "Following" : "Follow";

            const followerStat = document.querySelector("[data-follower-count]");
            if (followerStat) followerStat.textContent = data.followerCount;
        } catch (err) {
            console.error("Follow failed:", err.message);
        } finally {
            followBtn.disabled = false;
        }
    });

    /* ---------- Comment panel toggle ---------- */
    document.addEventListener("click", (event) => {
        const toggle = event.target.closest(".comment-toggle");
        if (!toggle) return;
        const panel = document.getElementById(toggle.dataset.target);
        if (panel) {
            panel.classList.toggle("open");
            if (panel.classList.contains("open")) {
                const input = panel.querySelector("input[name=body]");
                if (input) input.focus();
            }
        }
    });

    /* ---------- Add comment ---------- */
    document.addEventListener("submit", async (event) => {
        const form = event.target.closest(".comment-form");
        if (!form) return;
        event.preventDefault();

        const id = form.dataset.commentForm;
        const input = form.querySelector("input[name=body]");
        const body = (input.value || "").trim();
        if (!body) return;

        const list = document.querySelector(`[data-comment-list="${id}"]`);
        const card = form.closest(".post-card");
        const countEl = card ? card.querySelector(".comment-count") : null;

        try {
            const data = await post(`/posts/${id}/comments`, { body });
            const li = document.createElement("li");
            li.className = "comment-item";
            li.innerHTML = `<strong>${escapeHtml(data.comment.author.username)}</strong> <span>${escapeHtml(data.comment.body)}</span>`;
            list.appendChild(li);
            if (countEl) countEl.textContent = (parseInt(countEl.textContent, 10) || 0) + 1;
            const panel = document.getElementById(`comments-${id}`);
            if (panel) panel.classList.add("open");
            input.value = "";
        } catch (err) {
            console.error("Comment failed:", err.message);
        }
    });

    /* ---------- Story viewer ---------- */
    const viewer = document.getElementById("storyViewer");
    if (viewer) {
        const stage = document.getElementById("storyStage");
        const progress = document.getElementById("storyProgress");
        const closeBtn = document.getElementById("storyClose");
        const prevBtn = document.getElementById("storyPrev");
        const nextBtn = document.getElementById("storyNext");

        let queue = [];
        let index = 0;
        let timer = null;
        let currentUsername = "";

        const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

        const renderStory = (story) => {
            const bgClass = story.background ? ` ${story.background}` : "";
            let inner = "";
            if (story.media) {
                inner += `<img src="${escapeHtml(story.media)}" alt="Story" class="story-media">`;
            }
            if (story.text) {
                inner += `<div class="story-text${bgClass}">${escapeHtml(story.text)}</div>`;
            }
            if (!story.media && !story.text) {
                inner += `<div class="story-text${bgClass}">Story</div>`;
            }
            stage.innerHTML = `<div class="story-frame${story.media ? "" : bgClass}">${inner}</div>`;
            progress.style.width = `${((index + 1) / queue.length) * 100}%`;
        };

        const markViewed = (story) => {
            if (!story || !story._id) return;
            post(`/stories/${story._id}/view`).catch(() => {});
        };

        const show = (i) => {
            index = Math.max(0, Math.min(i, queue.length - 1));
            const story = queue[index];
            renderStory(story);
            markViewed(story);
            clearTimer();
            timer = setTimeout(() => {
                if (index < queue.length - 1) show(index + 1);
                else closeViewer();
            }, 5000);
        };

        const closeViewer = () => {
            clearTimer();
            viewer.hidden = true;
            stage.innerHTML = "";
            queue = [];
            index = 0;
        };

        const openViewer = (username, storiesJson) => {
            try {
                queue = JSON.parse(storiesJson) || [];
            } catch (e) {
                queue = [];
            }
            if (!queue.length) return;
            currentUsername = username;
            viewer.hidden = false;
            show(0);
        };

        document.addEventListener("click", (event) => {
            const item = event.target.closest(".story-item");
            if (item) {
                openViewer(item.dataset.storyUser, item.dataset.stories);
                return;
            }
        });

        closeBtn.addEventListener("click", closeViewer);
        prevBtn.addEventListener("click", () => show(index - 1));
        nextBtn.addEventListener("click", () => { if (index < queue.length - 1) show(index + 1); else closeViewer(); });
        viewer.addEventListener("click", (event) => { if (event.target === viewer) closeViewer(); });
        document.addEventListener("keydown", (event) => {
            if (viewer.hidden) return;
            if (event.key === "Escape") closeViewer();
            if (event.key === "ArrowRight") nextBtn.click();
            if (event.key === "ArrowLeft") prevBtn.click();
        });
    }
})();
