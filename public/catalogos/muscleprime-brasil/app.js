const data = window.CATALOG_DATA || { categories: [], products: [] };

const state = {
  category: "all",
  search: "",
  sort: "category",
};

const productList = document.querySelector("#productList");
const categoryList = document.querySelector("#categoryList");
const searchInput = document.querySelector("#searchInput");
const catalogTitle = document.querySelector("#catalogTitle");
const emptyState = document.querySelector("#emptyState");
const sortSelect = document.querySelector("#sortSelect");

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const categoryName = (id) => {
  if (id === "all") return "Tudo";
  return data.categories.find((category) => category.id === id)?.name || "Categoria";
};

const visibleProducts = () => {
  const query = normalize(state.search);
  return data.products
    .filter((product) => {
      const inCategory = state.category === "all" || product.categoryId === state.category;
      const inSearch =
        !query ||
        normalize(product.name).includes(query) ||
        normalize(product.categoryName).includes(query) ||
        normalize(product.search).includes(query);
      return inCategory && inSearch;
    })
    .sort((a, b) => {
      if (state.sort === "priceAsc") return a.price - b.price;
      if (state.sort === "priceDesc") return b.price - a.price;
      if (state.sort === "category" && state.category === "all") {
        const categorySort = a.categoryName.localeCompare(b.categoryName, "pt-BR");
        if (categorySort !== 0) return categorySort;
      }
      return a.name.trim().localeCompare(b.name.trim(), "pt-BR", { numeric: true });
    });
};

const renderCategories = () => {
  const buttons = [
    { id: "all", name: "Tudo" },
    ...data.categories.map((category) => ({ id: category.id, name: category.name })),
  ];

  categoryList.innerHTML = buttons
    .map(
      (category) => `
        <button
          class="category-button ${category.id === state.category ? "is-active" : ""}"
          type="button"
          data-category="${category.id}"
        >
          ${escapeHtml(category.name)}
        </button>
      `
    )
    .join("");
};

const renderProducts = () => {
  const products = visibleProducts();
  catalogTitle.textContent = categoryName(state.category);
  emptyState.hidden = products.length > 0;

  productList.innerHTML = products
    .map(
      (product) => `
        <article class="product-row">
          <div class="product-media">
            <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
          </div>
          <div class="product-copy">
            <h3>${escapeHtml(product.name.trim())}</h3>
            <span class="product-category">${escapeHtml(product.categoryName)}</span>
            <span class="product-price">${formatter.format(product.price)}</span>
          </div>
        </article>
      `
    )
    .join("");
};

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

renderCategories();
renderProducts();
