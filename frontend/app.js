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
        return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    
    // Try to detect local network - this helps with mobile devices
    if (window.location.hostname.startsWith('192.168.') || 
        window.location.hostname.startsWith('10.0.')) {
        return window.location.origin;
    }
    
    // Try to use the current computer's network IP if possible
    const networkIp = localStorage.getItem('autoDetectedIp');
    if (networkIp) {
        return `http://${networkIp}:5000`;
    }
    
    // Default to the host computer's IP rather than localhost
    return 'http://192.168.1.19:5000'; // Your computer's IP
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

// State
let currentUser = null;
let isAuthenticated = false;
let touchStartY = 0;
let touchEndY = 0;

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
        });
    });
    
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
            filterByCategory(categoryType);
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
        loadExploreContent();
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
    
    // For demonstration, let's load all images or a selection of recent ones
    fetch(`${API_BASE_URL}/image/images/1`) // Adjust this endpoint as needed
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
                <div class="feed-item-username">User ${image.user_id}</div>
                <div class="feed-item-timestamp">Artist</div>
            </div>
        </div>
        <img src="${image.url}" alt="${image.description || 'Tattoo image'}" class="feed-item-image">
        <div class="feed-item-description">${image.description || ''}</div>
        <div class="feed-item-actions">
            <div class="feed-action">
                <i class="far fa-heart"></i>
                <span>Like</span>
            </div>
            <div class="feed-action">
                <i class="far fa-comment"></i>
                <span>Comment</span>
            </div>
            <div class="feed-action">
                <i class="far fa-bookmark"></i>
                <span>Save</span>
            </div>
        </div>
    `;
    
    return feedItem;
}

// Load explore page content
function loadExploreContent() {
    const exploreGrid = document.querySelector('.explore-grid');
    exploreGrid.innerHTML = '<div class="loading-message">Loading explore content...</div>';
    
    // For demonstration, we'll load all images
    fetch(`${API_BASE_URL}/image/images/1`) // Adjust endpoint as needed
        .then(response => response.json())
        .then(data => {
            exploreGrid.innerHTML = '';
            
            if (data.status === 'success' && data.images.length > 0) {
                data.images.forEach(image => {
                    const exploreItem = document.createElement('div');
                    exploreItem.className = 'explore-item';
                    exploreItem.innerHTML = `<img src="${image.url}" alt="${image.description || 'Tattoo'}" loading="lazy">`;
                    
                    exploreItem.addEventListener('click', () => {
                        showImageDetails(image);
                    });
                    
                    exploreGrid.appendChild(exploreItem);
                });
            } else {
                exploreGrid.innerHTML = '<div class="no-content-message">No images found in explore.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading explore content:', error);
            exploreGrid.innerHTML = '<div class="error-message">Failed to load explore content. Please try again later.</div>';
        });
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
                    
                    galleryItem.addEventListener('click', () => {
                        showImageDetails(image, true);
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
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) return;
    
    navigateToPage('explorePage');
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-page="explorePage"]').classList.add('active');
    
    // Here you would typically call an API endpoint that supports searching
    // Since we don't have a specific search endpoint, we'll filter client-side
    // In a real app, you would implement server-side search
    
    const exploreGrid = document.querySelector('.explore-grid');
    exploreGrid.innerHTML = '<div class="loading-message">Searching...</div>';
    
    fetch(`${API_BASE_URL}/image/images/1`) // Example endpoint
        .then(response => response.json())
        .then(data => {
            exploreGrid.innerHTML = '';
            
            if (data.status === 'success' && data.images.length > 0) {
                const filteredImages = data.images.filter(image => 
                    (image.description && image.description.toLowerCase().includes(searchTerm))
                );
                
                if (filteredImages.length > 0) {
                    filteredImages.forEach(image => {
                        const exploreItem = document.createElement('div');
                        exploreItem.className = 'explore-item';
                        exploreItem.innerHTML = `<img src="${image.url}" alt="${image.description || 'Tattoo'}" loading="lazy">`;
                        exploreGrid.appendChild(exploreItem);
                    });
                } else {
                    exploreGrid.innerHTML = '<div class="no-content-message">No results found for your search.</div>';
                }
            } else {
                exploreGrid.innerHTML = '<div class="no-content-message">No images available for search.</div>';
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            exploreGrid.innerHTML = '<div class="error-message">Search failed. Please try again later.</div>';
        });
}

function filterByCategory(category) {
    const exploreGrid = document.querySelector('.explore-grid');
    exploreGrid.innerHTML = '<div class="loading-message">Loading category: ' + category + '...</div>';
    
    // In a real application, you would have an API endpoint to filter by category
    // Here we're just simulating it with the existing endpoint
    
    fetch(`${API_BASE_URL}/image/images/1`) // Example endpoint
        .then(response => response.json())
        .then(data => {
            exploreGrid.innerHTML = '';
            
            if (data.status === 'success' && data.images.length > 0) {
                // In a real app, you would filter by the actual category
                const filteredImages = data.images;
                
                filteredImages.forEach(image => {
                    const exploreItem = document.createElement('div');
                    exploreItem.className = 'explore-item';
                    exploreItem.innerHTML = `<img src="${image.url}" alt="${image.description || 'Tattoo'}" loading="lazy">`;
                    exploreGrid.appendChild(exploreItem);
                });
            } else {
                exploreGrid.innerHTML = '<div class="no-content-message">No images found in this category.</div>';
            }
        })
        .catch(error => {
            console.error('Category filter error:', error);
            exploreGrid.innerHTML = '<div class="error-message">Failed to load category. Please try again later.</div>';
        });
}

// Utility functions
function showImageDetails(image, isOwner = false) {
    // This function would show a modal with the image details
    // For now, we'll just log it to console
    console.log('Image details:', image);
    
    // In a real app, you would create a modal to show the image details
    // You could add options to edit or delete if the user is the owner
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
