
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- Hero Sparkle Animation ---
function initializeSparkleAnimation() {
    const heroAnimation = document.querySelector('.hero-animation-preview') as HTMLElement;
    if (!heroAnimation) return;

    const COOLDOWN = 100; // ms
    let lastSparkleTime = 0;

    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastSparkleTime < COOLDOWN) return;
        lastSparkleTime = now;
        
        const sparkle = document.createElement('div');
        sparkle.classList.add('sparkle');
        
        const size = Math.random() * 20 + 10;
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        
        sparkle.style.left = `${e.clientX}px`;
        sparkle.style.top = `${e.clientY + window.scrollY}px`;
        
        const animationDuration = Math.random() * 1.5 + 1.5;
        sparkle.style.animationDuration = `${animationDuration}s`;
        
        heroAnimation.appendChild(sparkle);

        setTimeout(() => {
            sparkle.remove();
        }, animationDuration * 1000);
    });
}


// --- Interactive Text Generation Modal ---
function initializeTextGeneratorModal() {
    // --- 1. DOM Element Selection & Validation ---
    const elements = {
        textToolCard: document.querySelector('[data-tool="text"]'),
        modal: document.getElementById('text-generator-modal'),
        closeModalBtn: document.querySelector('.modal-close-btn') as HTMLButtonElement,
        form: document.querySelector('#text-generator-modal form'),
        promptInput: document.getElementById('prompt-input') as HTMLTextAreaElement,
        resultContainer: document.querySelector('.modal-result'),
        generateBtn: document.querySelector('#text-generator-modal button[type="submit"]') as HTMLButtonElement,
        modalSubtitle: document.querySelector('#text-generator-modal .modal-subtitle') as HTMLElement,
        pageContent: document.querySelectorAll('.page-content')
    };

    for (const [key, el] of Object.entries(elements)) {
        if (!el || (el instanceof NodeList && el.length === 0)) {
            console.error(`Initialization failed: Modal element "${key}" not found.`);
            return;
        }
    }

    const { textToolCard, modal, closeModalBtn, form, promptInput, resultContainer, generateBtn, modalSubtitle, pageContent } = elements;

    let focusedElementBeforeModal: HTMLElement | null = null;
    let ai: GoogleGenAI;

    // --- 2. API Key and AI Initialization Check ---
    if (!process.env.API_KEY) {
        generateBtn.disabled = true;
        promptInput.disabled = true;
        promptInput.placeholder = "API key is not configured.";
        modalSubtitle.textContent = "Error: API key is missing. Please configure it in your environment variables.";
        modalSubtitle.style.color = 'var(--accent-red)';
    } else {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    
    // --- 3. Modal Management Functions ---
    const openModal = () => {
        focusedElementBeforeModal = document.activeElement as HTMLElement;
        modal.style.visibility = 'visible';
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        
        pageContent.forEach(el => el.setAttribute('aria-hidden', 'true'));
        modal.setAttribute('aria-hidden', 'false');

        promptInput.focus();
        document.addEventListener('keydown', handleKeydown);
    };

    const closeModal = () => {
        modal.classList.remove('visible');
        // Allow animation to finish before hiding
        setTimeout(() => {
            modal.style.visibility = 'hidden';
            document.body.style.overflow = '';
        }, 300);

        pageContent.forEach(el => el.removeAttribute('aria-hidden'));
        modal.setAttribute('aria-hidden', 'true');
        
        focusedElementBeforeModal?.focus();
        document.removeEventListener('keydown', handleKeydown);
    };

    // --- 4. Accessibility & Keyboard Navigation ---
    const handleKeydown = (e: KeyboardEvent) => {
        // Close modal on Escape key
        if (e.key === 'Escape') {
            closeModal();
            return;
        }

        // Trap focus within the modal
        if (e.key === 'Tab') {
            const focusableElements = [promptInput, generateBtn, closeModalBtn].filter(el => !el.disabled);
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                // Shift + Tab from the first element
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                // Tab from the last element
                e.preventDefault();
                firstElement.focus();
            }
        }
    };

    // --- 5. Gemini API Call Logic ---
    const handleFormSubmit = async (e: Event) => {
        e.preventDefault();
        if (!ai) return;

        const prompt = promptInput.value.trim();
        if (!prompt) return;

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        resultContainer.innerHTML = '<div class="spinner"></div>';
        modalSubtitle.style.display = 'none';

        try {
            const responseStream = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: "You are an expert code generation assistant. Your goal is to provide clean, efficient, and well-documented code in various programming languages based on the user's request. Always wrap code blocks in Markdown-style triple backticks.",
                },
            });
            
            resultContainer.innerHTML = ''; // Clear spinner
            let fullResponse = '';
            
            for await (const chunk of responseStream) {
                const text = chunk.text;
                fullResponse += text;
                // Using textContent is a safe way to append text and prevent XSS
                resultContainer.textContent = fullResponse;
            }

            if (fullResponse.trim() === '') {
                resultContainer.innerHTML = `<p>The AI returned an empty response. Please try rephrasing your prompt.</p>`;
            }

        } catch (error) {
            console.error("Gemini API Error:", error);
            resultContainer.innerHTML = `<p class="error">Sorry, an error occurred while generating the code. Please check the console for details.</p>`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate';
            modalSubtitle.style.display = 'block';
        }
    };

    // --- 6. Event Listeners ---
    textToolCard.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    form.addEventListener('submit', handleFormSubmit);
}


// --- Initialize all scripts on page load ---
document.addEventListener('DOMContentLoaded', () => {
    initializeSparkleAnimation();
    initializeTextGeneratorModal();
});
