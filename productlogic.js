import { products } from './products.js';

const grid = document.getElementById('product-grid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const assetOkCache = new Map();

async function assetExists(url) {
  if (!url) return false;
  if (assetOkCache.has(url)) return assetOkCache.get(url);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const ok = res.ok;
    assetOkCache.set(url, ok);
    return ok;
  } catch {
    assetOkCache.set(url, false);
    return false;
  }
}

function makeFallbackNode(text = 'Preview not available') {
  const d = document.createElement('div');
  d.className = 'no-asset';
  d.textContent = text;
  return d;
}

function makeImageNode(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.addEventListener('error', () => {
    img.replaceWith(makeFallbackNode());
  });
  return img;
}

function getWishlist() {
  return JSON.parse(localStorage.getItem('wishlist') || '[]');
}

function setWishlist(wishlist) {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

function isWishlisted(name) {
  return getWishlist().some(item => item.name === name);
}

async function renderProducts() {
  const searchTerm = (searchInput.value || '').toLowerCase();
  let filtered = products.filter(
    p => p.name.toLowerCase().includes(searchTerm) ||
         p.category.toLowerCase().includes(searchTerm)
  );
  const sortValue = sortSelect.value;
  if (sortValue) {
    const [key, order] = sortValue.split('-');
    filtered.sort((a, b) => {
      if (key === 'price') {
        return order === 'asc' ? a.price - b.price : b.price - a.price;
      } else if (key === 'name' || key === 'category') {
        const aVal = String(a[key]).toLowerCase();
        const bVal = String(b[key]).toLowerCase();
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      }
      return 0;
    });
  }
  grid.innerHTML = '';
  for (const p of filtered) {
    const div = document.createElement('div');
    div.className = 'product';
    div.setAttribute('data-name', p.name);
    div.setAttribute('data-price', p.price);
    div.setAttribute('data-category', p.category);
    div.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      window.location.href = 'product.html?name=' + encodeURIComponent(p.name);
    };
    let previewNode = null;
    const hasGLB = await assetExists(p.glb);
    if (hasGLB) {
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', p.glb);
      mv.setAttribute('alt', p.name + ' 3D view');
      mv.setAttribute('auto-rotate', '');
      mv.setAttribute('camera-controls', '');
      mv.setAttribute('ar', '');
      mv.setAttribute('shadow-intensity', '1');
      mv.addEventListener('error', () => {
        mv.replaceWith(p.img ? makeImageNode(p.img, p.name) : makeFallbackNode());
      });
      previewNode = mv;
    } else if (p.img) {
      previewNode = makeImageNode(p.img, p.name);
    } else {
      previewNode = makeFallbackNode();
    }
    div.appendChild(previewNode);
    div.insertAdjacentHTML('beforeend', `
      <h3>${p.name}</h3>
      <p class="category">${p.category}</p>
      <p>₹${p.price}.00</p>
      <div class="button-row">
        <button class="cart-btn" type="button">Add to Cart</button>
        <button class="wishlist-btn${isWishlisted(p.name) ? ' added' : ''}" type="button">
          ${isWishlisted(p.name) ? "Remove from Wishlist" : "Add to Wishlist"}
        </button>
      </div>
    `);
    div.querySelector('.cart-btn').onclick = (event) => {
      event.stopPropagation();
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find(item => item.name === p.name);
      if (existing) existing.quantity += 1;
      else cart.push({ name: p.name, price: p.price, quantity: 1 });
      localStorage.setItem('cart', JSON.stringify(cart));
      alert(p.name + " added to cart!");
    };
    const wishBtn = div.querySelector('.wishlist-btn');
    wishBtn.onclick = (event) => {
      event.stopPropagation();
      let wishlist = getWishlist();
      const index = wishlist.findIndex(item => item.name === p.name);
      if (index > -1) {
        wishlist.splice(index, 1);
        wishBtn.classList.remove('added');
        wishBtn.textContent = "Add to Wishlist";
      } else {
        wishlist.push({ name: p.name, price: p.price, category: p.category, img: p.img, glb: p.glb });
        wishBtn.classList.add('added');
        wishBtn.textContent = "Remove from Wishlist";
      }
      setWishlist(wishlist);
    };
    grid.appendChild(div);
  }
}

searchInput.addEventListener('input', () => { renderProducts(); });
sortSelect.addEventListener('change', () => { renderProducts(); });
window.onload = () => { renderProducts(); };
