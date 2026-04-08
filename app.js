import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const defaultPolls = [
  {
    question: "Build a new community park?",
    description: "A safe place for families, green space, and public events.",
  },
  {
    question: "Improve local roads and sidewalks?",
    description: "Help reduce accidents and support walkable neighborhoods.",
  },
  {
    question: "Expand free public Wi-Fi?",
    description: "Ensure better connectivity at parks, libraries, and civic spaces.",
  },
  {
    question: "Add more street lights at night?",
    description: "Increase safety for pedestrians and cyclists after dark.",
  },
  {
    question: "Upgrade drinking water quality?",
    description: "Invest in clean, reliable water infrastructure for all households.",
  },
];

const LOCAL_VOTE_KEY = "citizen-poll-votes";
let pollsCache = [];
let unsubscribe = null;

function getVotedPolls() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_VOTE_KEY) || "[]");
  } catch {
    return [];
  }
}

function markPollVoted(id) {
  const votes = new Set(getVotedPolls());
  votes.add(id);
  localStorage.setItem(LOCAL_VOTE_KEY, JSON.stringify(Array.from(votes)));
}

function hasVoted(id) {
  return getVotedPolls().includes(id);
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function sortPolls(items, mode) {
  if (mode === "popular") {
    return [...items].sort((a, b) => (b.yes + b.no) - (a.yes + a.no));
  }
  if (mode === "yes") {
    return [...items].sort((a, b) => {
      const aTotal = a.yes + a.no;
      const bTotal = b.yes + b.no;
      const aPct = aTotal ? a.yes / aTotal : 0;
      const bPct = bTotal ? b.yes / bTotal : 0;
      return bPct - aPct;
    });
  }
  return [...items].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

function renderPolls() {
  const queryText = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
  const sortMode = document.getElementById("sortSelect")?.value || "recent";
  const filtered = pollsCache.filter((poll) =>
    poll.question.toLowerCase().includes(queryText) || poll.description?.toLowerCase().includes(queryText)
  );
  const sorted = sortPolls(filtered, sortMode);

  const html = sorted
    .map((poll) => {
      const total = poll.yes + poll.no;
      const yesPercent = total ? Math.round((poll.yes / total) * 100) : 0;
      const noPercent = 100 - yesPercent;
      const voted = hasVoted(poll.id);
      return `
      <article class="card">
        <div class="card-head">
          <h3>${poll.question}</h3>
          <span class="poll-date">${formatDate(poll.createdAt)}</span>
        </div>
        ${poll.description ? `<p class="description">${poll.description}</p>` : ""}
        <div class="tallies">
          <span>👍 ${poll.yes}</span>
          <span>👎 ${poll.no}</span>
          <span>${total} votes</span>
        </div>
        <div class="meter">
          <div class="fill yes" style="width:${yesPercent}%"></div>
          <div class="fill no" style="width:${noPercent}%"></div>
        </div>
        <p class="percent">Yes ${yesPercent}% · No ${noPercent}%</p>
        <div class="vote-actions">
          <button ${voted ? "disabled" : ""} onclick="vote('${poll.id}','yes')">Yes</button>
          <button ${voted ? "disabled" : ""} onclick="vote('${poll.id}','no')">No</button>
        </div>
        ${voted ? "<p class='voted-badge'>You've voted on this proposal</p>" : ""}
      </article>`;
    })
    .join("");

  document.getElementById("polls").innerHTML = html || "<p class='empty'>No proposals match your search.</p>";
}

async function seedDefaultPolls() {
  const pollsRef = collection(db, "polls");
  if (pollsCache.length === 0) {
    for (const poll of defaultPolls) {
      await addDoc(pollsRef, {
        question: poll.question,
        description: poll.description,
        yes: 0,
        no: 0,
        createdAt: serverTimestamp(),
      });
    }
  }
}

function subscribePolls() {
  const pollsRef = query(collection(db, "polls"), orderBy("createdAt", "desc"));
  unsubscribe = onSnapshot(pollsRef, (snapshot) => {
    pollsCache = snapshot.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
    const totalVotes = pollsCache.reduce((sum, poll) => sum + poll.yes + poll.no, 0);
    const totalPolls = pollsCache.length;
    document.getElementById("pollSummary").textContent = `${totalPolls} active proposal(s) • ${totalVotes} total vote(s)`;
    renderPolls();
  });
}

window.vote = async (id, choice) => {
  if (hasVoted(id)) {
    alert("You have already voted on this proposal.");
    return;
  }

  const ref = doc(db, "polls", id);
  await updateDoc(ref, { [choice]: increment(1) });
  markPollVoted(id);
};

window.createPoll = async (event) => {
  event.preventDefault();
  const questionInput = document.getElementById("pollQuestion");
  const descriptionInput = document.getElementById("pollDescription");
  const question = questionInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!question) return;

  await addDoc(collection(db, "polls"), {
    question,
    description,
    yes: 0,
    no: 0,
    createdAt: serverTimestamp(),
  });

  questionInput.value = "";
  descriptionInput.value = "";
};

function initEvents() {
  document.getElementById("pollForm").addEventListener("submit", window.createPoll);
  document.getElementById("searchInput").addEventListener("input", renderPolls);
  document.getElementById("sortSelect").addEventListener("change", renderPolls);
}

async function main() {
  initEvents();
  subscribePolls();
  await seedDefaultPolls();
}

main();
