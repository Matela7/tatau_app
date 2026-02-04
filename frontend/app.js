// API Base URL - Use computer's IP address by default
const getApiBaseUrl = () => {
    // First priority: Use manually configured URL from settings if available
    const storedUrl = localStorage.getItem('apiBaseUrl');
    if (storedUrl) {
        return storedUrl;
    }
    
    // Second priority: If we're already on the server domain, use that
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
        // We're already connected through a specific IP or hostname
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    
    // Try to detect local network - this helps with mobile devices
    if (window.location.hostname.startsWith('192.168.') || 
        window.location.hostname.startsWith('10.0.')) {
        return window.location.origin;
    }
    
    // Try to use the current computer's network IP if possible
    const networkIp = localStorage.getItem('autoDetectedIp');
    if (networkIp) {
        return `http://${networkIp}:8000`;
    }
    
    // Default to localhost for local development
    return 'http://localhost:8000';
};

// Add auto-detection of server IP during startup
function detectAndSaveServerIP() {
    // If we're running on the actual server, save the IP for future use
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
        localStorage.setItem('autoDetectedIp', window.location.hostname);
    }
}

// Call this function when the app starts
document.addEventListener('DOMContentLoaded', detectAndSaveServerIP);

// DOM Elements
const API_BASE_URL = getApiBaseUrl();
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const uploadModal = document.getElementById('uploadModal');
const imageDetailModal = document.getElementById('imageDetailModal');
const closeModalButtons = document.querySelectorAll('.close-modal');
const uploadBtn = document.getElementById('uploadBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const uploadForm = document.getElementById('uploadForm');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const categories = document.querySelectorAll('.category');
const imageFile = document.getElementById('imageFile');
const imagePreview = document.getElementById('imagePreview');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const commentInput = document.getElementById('commentInput');
const commentSubmitBtn = document.getElementById('commentSubmitBtn');

// State
let currentUser = null;
let isAuthenticated = false;
let touchStartY = 0;
let touchEndY = 0;
let suppressExploreAutoLoad = false; // prevents auto-loading explore content in special flows

// Initialize the application
function initApp() {
    // Check for logged in user in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        isAuthenticated = true;
        updateUIForAuthenticatedUser();
    }
    
    // Show API connection status
    checkApiConnection();
    
    // Load initial content
    loadForYouFeed();
    setupEventListeners();
}

function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateToPage(pageId);
            
            // If profile page is selected and user is logged in, load user's images
            if (pageId === 'profilePage' && isAuthenticated) {
                loadUserProfile();
            }
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Modal controls
    loginBtn.addEventListener('click', () => {
        if (isAuthenticated) {
            // Logout if already logged in
            logout();
        } else {
            loginModal.style.display = 'flex';
        }
    });
    
    registerBtn.addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
    
    uploadBtn.addEventListener('click', () => {
        if (isAuthenticated) {
            uploadModal.style.display = 'flex';
        } else {
            showNotification('Please login to upload images');
        }
    });
    
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            uploadModal.style.display = 'none';
            imageDetailModal.style.display = 'none';
        });
    });

    if (detailCloseBtn) {
        detailCloseBtn.addEventListener('click', closeImageDetail);
    }
    
    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    uploadForm.addEventListener('submit', handleImageUpload);
    
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Categories
    categories.forEach(category => {
        category.addEventListener('click', () => {
            categories.forEach(c => c.classList.remove('active'));
            category.classList.add('active');
            
            const categoryType = category.getAttribute('data-category');
            const searchTerm = searchInput.value.trim();
            filterByCategory(categoryType, searchTerm);
        });
    });
    
    // Image preview on upload
    imageFile.addEventListener('change', previewImage);
    
    // Improved touch events for mobile
    setupMobileGestures();
    
    // Window click to close modals when clicked outside
    window.addEventListener('click', event => {
        if (event.target === loginModal) loginModal.style.display = 'none';
        if (event.target === registerModal) registerModal.style.display = 'none';
        if (event.target === uploadModal) uploadModal.style.display = 'none';
        if (event.target === imageDetailModal) imageDetailModal.style.display = 'none';
    });

    // Close on Escape
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            uploadModal.style.display = 'none';
            imageDetailModal.style.display = 'none';
        }
    });
    
    // Fix 100vh issue on mobile browsers and handle orientation changes
    window.addEventListener('resize', adjustMobileLayout);
    window.addEventListener('orientationchange', adjustMobileLayout);
    adjustMobileLayout();
}

function setupMobileGestures() {
    // Touch events for pull-to-refresh
    const allPages = document.querySelectorAll('.page');
    
    allPages.forEach(page => {
        page.addEventListener('touchstart', e => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        page.addEventListener('touchend', e => {
            touchEndY = e.changedTouches[0].clientY;
            handleSwipeGesture();
        }, { passive: true });
    });
    
    // Prevent zoom on double tap for iOS
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
    
    // Handle back button for better mobile navigation
    window.addEventListener('popstate', function() {
        // Get the active page
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            // Get the ID of the active page
            const activePageId = activePage.id;
            
            // If we're not on the forYouPage, navigate back to it
            if (activePageId !== 'forYouPage') {
                navigateToPage('forYouPage');
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('[data-page="forYouPage"]').classList.add('active');
            }
        }
    });
}

function adjustMobileLayout() {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    
    // Fix height for mobile browsers
    main.style.height = `${window.innerHeight - header.offsetHeight - nav.offsetHeight}px`;
    
    // Adjust feed container width based on orientation
    const feedContainer = document.querySelector('.feed-container');
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (feedContainer) {
        if (isLandscape && window.innerWidth > 768) {
            // On landscape tablets and desktops, limit the width
            feedContainer.style.maxWidth = '600px';
        } else {
            // On phones or portrait mode, use full width
            feedContainer.style.maxWidth = '100%';
        }
    }
    
    // Make sure buttons in nav are visible
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        // Ensure icon is visible
        const icon = item.querySelector('i');
        if (icon) {
            icon.style.fontSize = window.innerWidth < 360 ? '1.1rem' : '1.3rem';
        }
        
        // Ensure text is visible
        const span = item.querySelector('span');
        if (span) {
            span.style.fontSize = window.innerWidth < 360 ? '10px' : '12px';
        }
    });
}

function handleSwipeGesture() {
    const swipeDistance = touchEndY - touchStartY;
    
    // Pull down to refresh
    if (swipeDistance > 100 && window.scrollY === 0) {
        const activePage = document.querySelector('.page.active');
        if (activePage.id === 'forYouPage') {
            loadForYouFeed();
            showNotification('Refreshing feed...');
        } else if (activePage.id === 'explorePage') {
            loadExploreContent();
            showNotification('Refreshing explore page...');
        } else if (activePage.id === 'profilePage' && isAuthenticated) {
            loadUserProfile();
            showNotification('Refreshing profile...');
        }
    }
}

// Check API connection
function checkApiConnection() {
    fetch(`${API_BASE_URL}/`)
        .then(response => {
            if (response.ok) {
                console.log('Connected to API successfully');
                document.querySelector('.logo').style.color = 'var(--primary-color)';
            } else {
                console.error('API connection error:', response.status);
                document.querySelector('.logo').style.color = 'red';
                showNotification('API connection error. Check server settings.');
            }
        })
        .catch(error => {
            console.error('Failed to connect to API:', error);
            document.querySelector('.logo').style.color = 'red';
            showNotification('Failed to connect to API. Check server settings.');
        });
}

// Navigation
function navigateToPage(pageId) {
    pages.forEach(page => {
        if (page.id === pageId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });
    
    // Load page-specific content
    if (pageId === 'forYouPage') {
        loadForYouFeed();
    } else if (pageId === 'explorePage') {
        if (suppressExploreAutoLoad) {
            suppressExploreAutoLoad = false; // consume the flag
        } else {
            loadExploreContent();
        }
    } else if (pageId === 'profilePage') {
        if (isAuthenticated) {
            loadUserProfile();
        } else {
            showNotification('Please login to view your profile');
            navigateToPage('forYouPage');
            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-page="forYouPage"]').classList.add('active');
        }
    }
}

// Load the "For You" feed with images
function loadForYouFeed() {
    const feedContainer = document.querySelector('.feed-container');
    const loadingSpinner = document.querySelector('.loading-spinner');
    
    feedContainer.innerHTML = '';
    loadingSpinner.style.display = 'flex';
    
    const userQuery = isAuthenticated && currentUser ? `?user_id=${encodeURIComponent(currentUser.id)}` : '';
    fetch(`${API_BASE_URL}/image/feed${userQuery}`)
        .then(response => response.json())
        .then(data => {
            loadingSpinner.style.display = 'none';
            if (data.status === 'success' && data.images.length > 0) {
                data.images.forEach(image => {
                    const feedItem = createFeedItem(image);
                    feedContainer.appendChild(feedItem);
                });
            } else {
                feedContainer.innerHTML = '<div class="no-content-message">No images found. Follow some artists to see their work!</div>';
            }
        })
        .catch(error => {
            loadingSpinner.style.display = 'none';
            console.error('Error loading feed:', error);
            feedContainer.innerHTML = '<div class="error-message">Failed to load content. Please try again later.</div>';
        });
}

// Create a feed item element
function createFeedItem(image) {
    const feedItem = document.createElement('div');
    feedItem.className = 'feed-item';
    
    feedItem.innerHTML = `
        <div class="feed-item-header">
            <div class="feed-item-user-icon">
                <i class="fas fa-user"></i>
            </div>
            <div class="feed-item-user-info">
                <div class="feed-item-username" style="cursor: pointer;">${image.username || 'User ' + image.user_id}</div>
                <div class="feed-item-timestamp">${image.user_type || 'Artist'}</div>
            </div>
        </div>
        <img src="${image.url}" alt="${image.description || 'Tattoo image'}" class="feed-item-image" style="cursor: pointer;">
        <div class="feed-item-description">${image.description || ''}</div>
        <div class="feed-item-actions">
            <div class="feed-action like-action" data-image-id="${image.id}">
                <i class="far fa-heart"></i>
                <span class="like-count">0</span>
            </div>
            <div class="feed-action comment-action">
                <i class="far fa-comment"></i>
                <span class="comment-count">0</span>
            </div>
            <div class="feed-action save-action" data-image-id="${image.id}">
                <i class="far fa-bookmark"></i>
                <span class="save-count">0</span>
            </div>
        </div>
    `;
    
    // Load interactions for this image
    loadImageInteractions(feedItem, image.id);
    
    // Add click event to image to show details
    const feedImage = feedItem.querySelector('.feed-item-image');
    feedImage.addEventListener('click', () => {
        showImageDetails(image, false);
    });
    
    // Add click event to username to view user's profile
    const usernameElement = feedItem.querySelector('.feed-item-username');
    usernameElement.addEventListener('click', (e) => {
        e.stopPropagation();
        viewUserProfile(image.user_id, image.username || 'User ' + image.user_id);
    });
    
    if (isAuthenticated && currentUser) {
        // Rejestruj "view" tylko jeśli użytkownik jest zalogowany
        fetch(`${API_BASE_URL}/interaction/record-interaction?image_id=${image.id}&user_id=${currentUser.id}&interaction_type=view`, {
            method: 'POST'
        }).catch(error => console.error('Error recording view:', error));
    }
    
    // Dodaj obsługę kliknięć na przyciski akcji
    const likeBtn = feedItem.querySelector('.like-action');
    const commentBtn = feedItem.querySelector('.comment-action');
    const saveBtn = feedItem.querySelector('.save-action');
    
    if (isAuthenticated && currentUser) {
        likeBtn.addEventListener('click', () => {
            const icon = likeBtn.querySelector('i');
            const count = likeBtn.querySelector('.like-count');
            const isLiked = icon.classList.contains('fas');
            
            // Toggle visual state
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            icon.style.color = !isLiked ? 'var(--primary-color)' : 'var(--text-secondary)';
            count.textContent = parseInt(count.textContent) + (isLiked ? -1 : 1);
            
            // Rejestruj interakcję
            fetch(`${API_BASE_URL}/interaction/record-interaction?image_id=${image.id}&user_id=${currentUser.id}&interaction_type=like`, {
                method: 'POST'
            }).catch(error => console.error('Error recording like:', error));
        });
        
        saveBtn.addEventListener('click', () => {
            const icon = saveBtn.querySelector('i');
            const count = saveBtn.querySelector('.save-count');
            const isSaved = icon.classList.contains('fas');
            
            // Toggle visual state
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            icon.style.color = !isSaved ? 'var(--primary-color)' : 'var(--text-secondary)';
            count.textContent = parseInt(count.textContent) + (isSaved ? -1 : 1);
                
            // Rejestruj interakcję
            fetch(`${API_BASE_URL}/interaction/record-interaction?image_id=${image.id}&user_id=${currentUser.id}&interaction_type=save`, {
                method: 'POST'
            }).catch(error => console.error('Error recording save:', error));
        });
        
        commentBtn.addEventListener('click', () => {
            showImageDetails(image, currentUser && currentUser.id === image.user_id, true);
        });
    } else {
        // Jeśli użytkownik nie jest zalogowany, nadal pokaż modal (bez możliwości dodania komentarza)
        likeBtn.addEventListener('click', () => showNotification('Please login to like images'));
        commentBtn.addEventListener('click', () => {
            showImageDetails(image, false, true);
            showNotification('Please login to comment');
        });
        saveBtn.addEventListener('click', () => showNotification('Please login to save images'));
    }
    
    return feedItem;
}

// Load interactions for an image
function loadImageInteractions(feedItem, imageId) {
    const userId = isAuthenticated && currentUser ? currentUser.id : null;
    const url = userId ? 
        `${API_BASE_URL}/interaction/image/${imageId}?user_id=${userId}` :
        `${API_BASE_URL}/interaction/image/${imageId}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update counts
                feedItem.querySelector('.like-count').textContent = data.likes;
                feedItem.querySelector('.comment-count').textContent = data.comments;
                feedItem.querySelector('.save-count').textContent = data.saves;
                
                // Update user interaction status
                if (data.user_liked) {
                    const likeIcon = feedItem.querySelector('.like-action i');
                    likeIcon.classList.remove('far');
                    likeIcon.classList.add('fas');
                    likeIcon.style.color = 'var(--primary-color)';
                }
                
                if (data.user_saved) {
                    const saveIcon = feedItem.querySelector('.save-action i');
                    saveIcon.classList.remove('far');
                    saveIcon.classList.add('fas');
                    saveIcon.style.color = 'var(--primary-color)';
                }
            }
        })
        .catch(error => console.error('Error loading interactions:', error));
}

// Load explore page content (default behavior when navigating to Explore)
function loadExploreContent() {
    const exploreGrid = document.querySelector('.explore-grid');
    if (!exploreGrid) return;

    const searchTerm = searchInput.value.trim();

    // If no search term, show friendly hint and skip network calls
    if (!searchTerm) {
        exploreGrid.className = 'explore-grid';
        exploreGrid.innerHTML = '<div class="no-content-message">Enter a search term above</div>';
        return;
    }

    // Use active category or default to accounts
    const activeCategory = document.querySelector('.category.active') || categories[0];
    const categoryType = activeCategory ? activeCategory.getAttribute('data-category') : 'accounts';

    // Delegate to the main filter function that handles accounts/tattoos
    filterByCategory(categoryType, searchTerm);
}

// Load user profile
function loadUserProfile() {
    if (!isAuthenticated || !currentUser) {
        return;
    }
    
    // Update profile information
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileType').textContent = currentUser.user_type;
    
    // Load user's images
    const profileGallery = document.querySelector('.profile-gallery');
    profileGallery.innerHTML = '<div class="loading-message">Loading your images...</div>';
    
    fetch(`${API_BASE_URL}/image/images/${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            profileGallery.innerHTML = '';
            
            if (data.status === 'success' && data.images.length > 0) {
                data.images.forEach(image => {
                    const galleryItem = document.createElement('div');
                    galleryItem.className = 'profile-gallery-item';
                    galleryItem.innerHTML = `
                        <img src="${image.url}" alt="${image.description || 'Your tattoo'}" loading="lazy">
                    `;
                    
                    // Add user info to image object for detail view
                    const imageWithUser = {
                        ...image,
                        user_id: currentUser.id,
                        username: currentUser.username,
                        user_type: currentUser.user_type
                    };
                    
                    galleryItem.addEventListener('click', () => {
                        showImageDetails(imageWithUser, true);
                    });
                    
                    profileGallery.appendChild(galleryItem);
                });
            } else {
                profileGallery.innerHTML = '<div class="no-content-message">You have not uploaded any images yet.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading user images:', error);
            profileGallery.innerHTML = '<div class="error-message">Failed to load your images. Please try again later.</div>';
        });
}

// Authentication
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/login_user/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username_or_email: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Set authenticated user
            currentUser = data.user;
            isAuthenticated = true;
            
            // Save to localStorage
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Update UI
            updateUIForAuthenticatedUser();
            
            // Close modal and show notification
            loginModal.style.display = 'none';
            showNotification(`Welcome back, ${currentUser.username}!`);
            
            // Navigate to profile page
            navigateToPage('profilePage');
            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-page="profilePage"]').classList.add('active');
        } else {
            showNotification('Login failed: ' + data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const userType = document.getElementById('userType').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/register_user?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&user_type=${encodeURIComponent(userType)}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Close register modal and open login
            registerModal.style.display = 'none';
            showNotification('Registration successful! Please login.');
            loginModal.style.display = 'flex';
        } else {
            showNotification('Registration failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.');
    }
}

function logout() {
    // Clear current user and auth state
    currentUser = null;
    isAuthenticated = false;
    
    // Remove from localStorage
    localStorage.removeItem('user');
    
    // Update UI
    updateUIForUnauthenticatedUser();
    
    // Navigate to for you page
    navigateToPage('forYouPage');
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-page="forYouPage"]').classList.add('active');
    
    showNotification('You have been logged out');
}

function updateUIForAuthenticatedUser() {
    loginBtn.textContent = 'Logout';
    registerBtn.style.display = 'none';
}

function updateUIForUnauthenticatedUser() {
    loginBtn.textContent = 'Login';
    registerBtn.style.display = 'block';
}

// Image upload
async function handleImageUpload(event) {
    event.preventDefault();
    
    if (!isAuthenticated) {
        showNotification('Please login to upload images');
        return;
    }
    
    const file = document.getElementById('imageFile').files[0];
    const description = document.getElementById('imageDescription').value;
    
    if (!file) {
        showNotification('Please select an image to upload');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('user_id', currentUser.id);
    
    try {
        // Show loading state
        const submitBtn = uploadForm.querySelector('.submit-btn');
        submitBtn.textContent = 'Uploading...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/image/upload?user_id=${currentUser.id}&description=${encodeURIComponent(description)}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Close upload modal
            uploadModal.style.display = 'none';
            showNotification('Image uploaded successfully!');
            
            // Reset form
            uploadForm.reset();
            imagePreview.style.display = 'none';
            
            // Reload profile if on profile page
            if (document.getElementById('profilePage').classList.contains('active')) {
                loadUserProfile();
            }
        } else {
            showNotification('Upload failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed. Please try again.');
    } finally {
        // Reset button state
        const submitBtn = uploadForm.querySelector('.submit-btn');
        submitBtn.textContent = 'Upload';
        submitBtn.disabled = false;
    }
}

function previewImage() {
    const file = imageFile.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        }
        
        reader.readAsDataURL(file);
    }
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    
    navigateToPage('explorePage');
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-page="explorePage"]').classList.add('active');
    
    // Get active category
    const activeCategory = document.querySelector('.category.active');
    const categoryType = activeCategory.getAttribute('data-category');
    
    // Always perform search, even with empty search term
    filterByCategory(categoryType, searchTerm);
}

function filterByCategory(category, searchTerm = '') {
    const exploreGrid = document.querySelector('.explore-grid');
    exploreGrid.innerHTML = '<div class="loading-message">Loading results...</div>';
    
    if (category === 'accounts') {
        // Search for user accounts
        searchAccounts(searchTerm);
    } else {
        // Search for tattoo ideas with the search term
        searchTattooIdeas(searchTerm);
    }
}

function searchAccounts(searchTerm) {
    const exploreGrid = document.querySelector('.explore-grid');
    exploreGrid.className = 'explore-grid'; // Reset to list view for accounts
    
    if (!searchTerm) {
        exploreGrid.innerHTML = '<div class="no-content-message">Please enter a search term</div>';
        return;
    }
    
    // Call the real endpoint to search users
    fetch(`${API_BASE_URL}/user/search?term=${encodeURIComponent(searchTerm)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            exploreGrid.innerHTML = '';
            
            if (data.status === 'success' && data.users && data.users.length > 0) {
                // Create a div for each user found
                data.users.forEach(user => {
                    const userItem = document.createElement('div');
                    userItem.className = 'user-item';
                    userItem.innerHTML = `
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-info">
                            <h3>${user.username}</h3>
                            <p>${user.user_type === 'artist' ? 'Tattoo Artist' : 
                               user.user_type === 'studio' ? 'Tattoo Studio' : 'Client'}</p>
                        </div>
                    `;
                    
                    userItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Show user profile or images
                        console.log('Clicked on user:', user.id, user.username);
                        // Clear search input to prevent re-searching
                        searchInput.value = '';
                        viewUserProfile(user.id, user.username);
                    });
                    
                    exploreGrid.appendChild(userItem);
                });
            } else {
                exploreGrid.innerHTML = '<div class="no-content-message">No users found matching your search.</div>';
            }
        })
        .catch(error => {
            console.error('Search accounts error:', error);
            exploreGrid.innerHTML = '<div class="error-message">Error searching for accounts. Please try again.</div>';
        });
}

function viewUserProfile(userId, username = null) {
    // Navigate to explore page to show user's content without auto search
    suppressExploreAutoLoad = true;
    navigateToPage('explorePage');
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-page="explorePage"]').classList.add('active');
    
    const exploreGrid = document.querySelector('.explore-grid');
    exploreGrid.className = 'explore-grid user-profile-view';
    exploreGrid.innerHTML = `<div class="loading-message">Loading ${username ? username + "'s" : "user's"} profile...</div>`;

    const followerParam = isAuthenticated && currentUser ? `?follower_id=${encodeURIComponent(currentUser.id)}` : '';

    // Fetch user info and their images
    Promise.all([
        fetch(`${API_BASE_URL}/user/user/${userId}${followerParam}`).then(r => r.json()),
        fetch(`${API_BASE_URL}/image/images/${userId}`).then(r => r.json())
    ])
    .then(([userData, imagesData]) => {
        const user = userData.status === 'success' ? userData.user : null;
        const images = imagesData.status === 'success' ? imagesData.images : [];

        exploreGrid.innerHTML = '';

        // Profile header (reuse profile layout styling)
        const profileContainer = document.createElement('div');
        profileContainer.className = 'profile-container';
        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="profile-image">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="profile-info">
                    <h2>${user ? user.username : username || 'User ' + userId}</h2>
                    <p>${user ? user.email : 'N/A'}</p>
                    <p>${user ? (user.user_type === 'artist' ? 'Tattoo Artist' : user.user_type === 'studio' ? 'Tattoo Studio' : 'Client') : 'User'}</p>
                </div>
            </div>
        `;

        // Follow/unfollow button (only if viewing someone else and logged in)
        if (isAuthenticated && currentUser && currentUser.id !== userId) {
            const followBtn = document.createElement('button');
            followBtn.className = 'action-button follow-toggle-btn';
            const initialFollowing = user && typeof user.is_following !== 'undefined' ? user.is_following : false;
            setFollowBtnState(followBtn, initialFollowing);

            followBtn.addEventListener('click', async () => {
                const newState = await toggleFollow(userId, followBtn.dataset.following === 'true');
                setFollowBtnState(followBtn, newState);
            });

            // append to header
            profileContainer.querySelector('.profile-header').appendChild(followBtn);
        }

        // Gallery section
        const gallery = document.createElement('div');
        gallery.className = 'profile-gallery';

        if (images && images.length > 0) {
            images.forEach(image => {
                const imgCard = document.createElement('div');
                imgCard.className = 'profile-image-card';
                imgCard.innerHTML = `<img src="${image.url}" alt="${image.description || 'Tattoo'}" loading="lazy">`;
                imgCard.addEventListener('click', () => {
                    showImageDetails({ ...image, user_id: userId, username: user ? user.username : username || 'User ' + userId, user_type: user ? user.user_type : 'artist' }, false);
                });
                gallery.appendChild(imgCard);
            });
        } else {
            const noImages = document.createElement('div');
            noImages.className = 'no-content-message';
            noImages.textContent = 'This user has no images yet.';
            gallery.appendChild(noImages);
        }

        profileContainer.appendChild(gallery);
        exploreGrid.appendChild(profileContainer);
    })
    .catch(error => {
        console.error('Error loading user profile:', error);
        exploreGrid.innerHTML = '<div class="error-message">Failed to load user profile.</div>';
    });
}

function searchTattooIdeas(searchTerm) {
    const exploreGrid = document.querySelector('.explore-grid');
    // Switch to grid view for tattoo images
    exploreGrid.className = 'explore-grid grid-view';
    
    const userQuery = isAuthenticated && currentUser ? `&user_id=${encodeURIComponent(currentUser.id)}` : '';
    fetch(`${API_BASE_URL}/image/feed?search_term=${encodeURIComponent(searchTerm)}${userQuery}`)
        .then(response => response.json())
        .then(data => {
            exploreGrid.innerHTML = '';
            
            if (data.status === 'success' && data.images.length > 0) {
                data.images.forEach(image => {
                    const exploreItem = document.createElement('div');
                    exploreItem.className = 'explore-item';
                    exploreItem.innerHTML = `<img src="${image.url}" alt="${image.description || 'Tattoo'}" loading="lazy">`;
                    
                    exploreItem.addEventListener('click', () => {
                        showImageDetails(image, false);
                    });
                    
                    exploreGrid.appendChild(exploreItem);
                });
            } else {
                exploreGrid.innerHTML = '<div class="no-content-message">No tattoo ideas found matching your search.</div>';
            }
        })
        .catch(error => {
            console.error('Search tattoos error:', error);
            exploreGrid.innerHTML = '<div class="error-message">Failed to search for tattoo ideas. Please try again later.</div>';
        });
}

// Show image in a modal
function showImageModal(image) {
    // Create a modal for the image
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="padding: 10px;">
            <span class="close-modal">&times;</span>
            <img src="${image.url}" alt="${image.description || 'Tattoo image'}" 
                style="max-width: 100%; max-height: 70vh; object-fit: contain;">
            <p style="margin-top: 10px;">${image.description || 'No description available'}</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Close on click outside
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Follow helpers
function setFollowBtnState(btn, isFollowing) {
    btn.dataset.following = isFollowing ? 'true' : 'false';
    btn.textContent = isFollowing ? 'Unfollow' : 'Follow';
    btn.classList.toggle('is-following', isFollowing);
}

async function toggleFollow(targetUserId, currentlyFollowing) {
    if (!isAuthenticated || !currentUser) {
        showNotification('Please login to follow users');
        return currentlyFollowing;
    }
    try {
        const action = currentlyFollowing ? 'unfollow' : 'follow';
        const response = await fetch(`${API_BASE_URL}/user/update_follow/${currentUser.id}/${targetUserId}?action=${action}`, {
            method: 'PUT'
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            return data.is_following ?? !currentlyFollowing;
        }
        showNotification(data.message || 'Follow action failed');
        return currentlyFollowing;
    } catch (err) {
        console.error('Follow toggle error:', err);
        showNotification('Follow action failed');
        return currentlyFollowing;
    }
}

function closeImageDetail() {
    imageDetailModal.style.display = 'none';
}

async function loadComments(imageId) {
    const listEl = document.querySelector('.comment-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="loading-message">Loading comments...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/comment/image/${imageId}`);
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            renderComments(data.comments);
        } else {
            listEl.innerHTML = '<div class="error-message">Failed to load comments.</div>';
        }
    } catch (err) {
        console.error('Load comments error:', err);
        listEl.innerHTML = '<div class="error-message">Failed to load comments.</div>';
    }
}

async function updateComment(commentId, newContent, imageId) {
    if (!newContent || !newContent.trim()) {
        showNotification('Comment cannot be empty');
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/comment/${commentId}?content=${encodeURIComponent(newContent.trim())}`, {
            method: 'PUT'
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            await loadComments(imageId);
            loadDetailInteractions(imageId);
        } else {
            showNotification(data.message || 'Failed to update comment');
        }
    } catch (err) {
        console.error('Update comment error:', err);
        showNotification('Failed to update comment');
    }
}

async function deleteComment(commentId, imageId) {
    if (!confirm('Delete this comment?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/comment/${commentId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            await loadComments(imageId);
            loadDetailInteractions(imageId);
        } else {
            showNotification(data.message || 'Failed to delete comment');
        }
    } catch (err) {
        console.error('Delete comment error:', err);
        showNotification('Failed to delete comment');
    }
}

function renderComments(comments) {
    const listEl = document.querySelector('.comment-list');
    if (!listEl) return;
    if (!comments || !comments.length) {
        listEl.innerHTML = '<div class="no-content-message">No comments yet.</div>';
        return;
    }
    listEl.innerHTML = '';
    comments.forEach(c => {
        const item = document.createElement('div');
        item.className = 'comment-item';

        const author = document.createElement('div');
        author.className = 'comment-author';
        author.textContent = c.username;

        const content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = c.content;

        item.appendChild(author);
        item.appendChild(content);

        if (isAuthenticated && currentUser && currentUser.id === c.user_id) {
            const actions = document.createElement('div');
            actions.className = 'comment-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'action-button';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                const newText = prompt('Edit comment:', c.content);
                if (newText !== null) {
                    updateComment(c.id, newText, c.image_id);
                }
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => deleteComment(c.id, c.image_id));

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            item.appendChild(actions);
        }

        listEl.appendChild(item);
    });
}

async function submitComment(imageId) {
    if (!isAuthenticated || !currentUser) {
        showNotification('Please login to comment');
        return;
    }
    const content = commentInput.value.trim();
    if (!content) {
        showNotification('Comment cannot be empty');
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/comment/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, image_id: imageId, content })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            commentInput.value = '';
            await loadComments(imageId);
            loadDetailInteractions(imageId);
        } else {
            showNotification(data.message || 'Failed to add comment');
        }
    } catch (err) {
        console.error('Add comment error:', err);
        showNotification('Failed to add comment');
    }
}

// Utility functions
function showImageDetails(image, isOwner = false, focusComment = false) {
    // Show the image detail modal
    imageDetailModal.style.display = 'flex';
    
    // Set image
    document.getElementById('detailImage').src = image.url;
    
    // Set user info
    const usernameElement = document.querySelector('.detail-username');
    usernameElement.textContent = image.username || 'User ' + image.user_id;
    usernameElement.style.cursor = 'pointer';
    
    // Add click event to username to view user's profile
    usernameElement.onclick = () => {
        imageDetailModal.style.display = 'none';
        viewUserProfile(image.user_id, image.username || 'User ' + image.user_id);
    };
    
    document.querySelector('.detail-user-type').textContent = image.user_type || 'Artist';

    // Follow button in modal (only for other users)
    const detailFollowBtn = document.getElementById('detailFollowBtn');
    if (isAuthenticated && currentUser && currentUser.id !== image.user_id) {
        detailFollowBtn.style.display = 'inline-flex';
        // Load current follow state
        fetch(`${API_BASE_URL}/user/user/${image.user_id}?follower_id=${currentUser.id}`)
            .then(r => r.json())
            .then(data => {
                const isFollowing = data?.user?.is_following || false;
                setFollowBtnState(detailFollowBtn, isFollowing);
            })
            .catch(err => console.error('Follow status fetch error:', err));

        detailFollowBtn.onclick = async () => {
            const newState = await toggleFollow(image.user_id, detailFollowBtn.dataset.following === 'true');
            setFollowBtnState(detailFollowBtn, newState);
        };
    } else {
        detailFollowBtn.style.display = 'none';
    }
    
    // Set description
    document.querySelector('.detail-description').textContent = image.description || 'No description available';
    
    // Show/hide delete button based on ownership
    const deleteBtn = document.getElementById('deleteImageBtn');
    if (isOwner && isAuthenticated && currentUser && currentUser.id === image.user_id) {
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => handleDeleteImage(image.id);
    } else {
        deleteBtn.style.display = 'none';
    }
    
    // Load interactions
    loadDetailInteractions(image.id);
    loadComments(image.id);

    if (commentSubmitBtn) {
        commentSubmitBtn.onclick = () => submitComment(image.id);
    }

    if (focusComment && commentInput) {
        commentInput.focus();
    }
    
    // Setup interaction buttons
    setupDetailInteractions(image.id);
    
    // Record view
    if (isAuthenticated && currentUser) {
        fetch(`${API_BASE_URL}/interaction/record-interaction?image_id=${image.id}&user_id=${currentUser.id}&interaction_type=view`, {
            method: 'POST'
        }).catch(error => console.error('Error recording view:', error));
    }
}

function loadDetailInteractions(imageId) {
    const userId = isAuthenticated && currentUser ? currentUser.id : null;
    const url = userId ? 
        `${API_BASE_URL}/interaction/image/${imageId}?user_id=${userId}` :
        `${API_BASE_URL}/interaction/image/${imageId}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update counts
                document.querySelector('.detail-like-count').textContent = data.likes;
                document.querySelector('.detail-comment-count').textContent = data.comments;
                document.querySelector('.detail-save-count').textContent = data.saves;
                
                // Update user interaction status
                const likeIcon = document.querySelector('.detail-like-action i');
                const saveIcon = document.querySelector('.detail-save-action i');
                
                if (data.user_liked) {
                    likeIcon.classList.remove('far');
                    likeIcon.classList.add('fas');
                    likeIcon.style.color = 'var(--primary-color)';
                }
                
                if (data.user_saved) {
                    saveIcon.classList.remove('far');
                    saveIcon.classList.add('fas');
                    saveIcon.style.color = 'var(--primary-color)';
                }
            }
        })
        .catch(error => console.error('Error loading interactions:', error));
}

function setupDetailInteractions(imageId) {
    const likeBtn = document.querySelector('.detail-like-action');
    const commentBtn = document.querySelector('.detail-comment-action');
    const saveBtn = document.querySelector('.detail-save-action');
    
    // Remove old listeners by cloning
    const newLikeBtn = likeBtn.cloneNode(true);
    const newCommentBtn = commentBtn.cloneNode(true);
    const newSaveBtn = saveBtn.cloneNode(true);
    
    likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
    commentBtn.parentNode.replaceChild(newCommentBtn, commentBtn);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    if (isAuthenticated && currentUser) {
        newLikeBtn.addEventListener('click', () => {
            const icon = newLikeBtn.querySelector('i');
            const count = newLikeBtn.querySelector('.detail-like-count');
            const isLiked = icon.classList.contains('fas');
            
            // Toggle visual state
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            icon.style.color = !isLiked ? 'var(--primary-color)' : 'var(--text-secondary)';
            count.textContent = parseInt(count.textContent) + (isLiked ? -1 : 1);
            
            // Record interaction
            fetch(`${API_BASE_URL}/interaction/record-interaction?image_id=${imageId}&user_id=${currentUser.id}&interaction_type=like`, {
                method: 'POST'
            }).catch(error => console.error('Error recording like:', error));
        });
        
        newSaveBtn.addEventListener('click', () => {
            const icon = newSaveBtn.querySelector('i');
            const count = newSaveBtn.querySelector('.detail-save-count');
            const isSaved = icon.classList.contains('fas');
            
            // Toggle visual state
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            icon.style.color = !isSaved ? 'var(--primary-color)' : 'var(--text-secondary)';
            count.textContent = parseInt(count.textContent) + (isSaved ? -1 : 1);
            
            // Record interaction
            fetch(`${API_BASE_URL}/interaction/record-interaction?image_id=${imageId}&user_id=${currentUser.id}&interaction_type=save`, {
                method: 'POST'
            }).catch(error => console.error('Error recording save:', error));
        });
        
        newCommentBtn.addEventListener('click', () => {
            if (commentInput) {
                commentInput.focus();
            } else {
                showNotification('Comments feature coming soon!');
            }
        });
    } else {
        newLikeBtn.addEventListener('click', () => showNotification('Please login to like images'));
        newCommentBtn.addEventListener('click', () => showNotification('Please login to comment'));
        newSaveBtn.addEventListener('click', () => showNotification('Please login to save images'));
    }
}

async function handleDeleteImage(imageId) {
    if (!confirm('Are you sure you want to delete this image?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/image/delete/${imageId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Image deleted successfully');
            imageDetailModal.style.display = 'none';
            loadUserProfile(); // Reload profile gallery
        } else {
            showNotification('Failed to delete image');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('Error deleting image');
    }
}

function showNotification(message) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set message and show
    notification.textContent = message;
    notification.classList.add('show');
    
    // Add tap-to-dismiss for mobile
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
    }, { once: true });
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);
