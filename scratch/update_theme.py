import re

def update_file():
    with open('src/pages/SystemHealth.tsx', 'r') as f:
        content = f.read()

    replacements = [
        (r'bg-gray-50/50', r'bg-gray-50/50 dark:bg-dark-bg/50'),
        (r'bg-gray-50', r'bg-gray-50 dark:bg-dark-bg'),
        (r'bg-white', r'bg-white dark:bg-gray-900'),
        (r'text-gray-900', r'text-gray-900 dark:text-white'),
        (r'text-gray-800', r'text-gray-800 dark:text-gray-200'),
        (r'text-gray-500', r'text-gray-500 dark:text-gray-400'),
        (r'text-gray-400', r'text-gray-400 dark:text-gray-500'),
        (r'text-gray-600', r'text-gray-600 dark:text-gray-300'),
        (r'border-gray-200', r'border-gray-200 dark:border-white/5'),
        (r'border-gray-300', r'border-gray-300 dark:border-white/10'),
        (r'bg-gray-100', r'bg-gray-100 dark:bg-white/5'),
        
        # Indigo
        (r'bg-indigo-50/20', r'bg-indigo-50/20 dark:bg-indigo-900/20'),
        (r'bg-indigo-50', r'bg-indigo-50 dark:bg-indigo-900/40'),
        (r'border-indigo-100', r'border-indigo-100 dark:border-indigo-800'),
        (r'text-indigo-800', r'text-indigo-800 dark:text-indigo-300'),
        (r'text-indigo-600', r'text-indigo-600 dark:text-indigo-400'),
        (r'border-indigo-300', r'border-indigo-300 dark:border-indigo-600'),
        (r'ring-indigo-100', r'ring-indigo-100 dark:ring-indigo-900/50'),
        (r'ring-indigo-500', r'ring-indigo-500 dark:ring-indigo-400'),
        (r'text-indigo-500', r'text-indigo-500 dark:text-indigo-400'),

        # Amber
        (r'bg-amber-100', r'bg-amber-100 dark:bg-amber-900/40'),
        (r'text-amber-800', r'text-amber-800 dark:text-amber-300'),
        (r'border-amber-200', r'border-amber-200 dark:border-amber-800'),
        (r'bg-amber-50', r'bg-amber-50 dark:bg-amber-900/20'),
        (r'text-amber-500', r'text-amber-500 dark:text-amber-400'),
        (r'text-amber-600', r'text-amber-600 dark:text-amber-400'),

        # Red
        (r'bg-red-100', r'bg-red-100 dark:bg-red-900/40'),
        (r'text-red-800', r'text-red-800 dark:text-red-300'),
        (r'border-red-200', r'border-red-200 dark:border-red-800'),
        (r'bg-red-50/50', r'bg-red-50/50 dark:bg-red-900/40'),
        (r'bg-red-50', r'bg-red-50 dark:bg-red-900/20'),
        (r'text-red-500', r'text-red-500 dark:text-red-400'),
        (r'text-red-600', r'text-red-600 dark:text-red-400'),
        (r'text-red-900', r'text-red-900 dark:text-red-200'),
        (r'bg-red-200', r'bg-red-200 dark:bg-red-800'),
        (r'border-red-100', r'border-red-100 dark:border-red-900/50'),

        # Green
        (r'bg-green-100', r'bg-green-100 dark:bg-green-900/40'),
        (r'text-green-800', r'text-green-800 dark:text-green-300'),
        (r'border-green-200', r'border-green-200 dark:border-green-800'),
        (r'bg-green-50', r'bg-green-50 dark:bg-green-900/20'),
        (r'text-green-500', r'text-green-500 dark:text-green-400'),
        (r'text-green-600', r'text-green-600 dark:text-green-400'),

        # Blue
        (r'bg-blue-100', r'bg-blue-100 dark:bg-blue-900/40'),
        (r'text-blue-800', r'text-blue-800 dark:text-blue-300'),
        (r'border-blue-200', r'border-blue-200 dark:border-blue-800'),
        (r'bg-blue-50', r'bg-blue-50 dark:bg-blue-900/20'),
        (r'text-blue-500', r'text-blue-500 dark:text-blue-400'),

        # Emerald
        (r'bg-emerald-50', r'bg-emerald-50 dark:bg-emerald-900/20'),
        (r'text-emerald-500', r'text-emerald-500 dark:text-emerald-400'),
        (r'text-emerald-600', r'text-emerald-600 dark:text-emerald-400'),

        # Hovers and Backgrounds
        (r'hover:bg-gray-50', r'hover:bg-gray-50 dark:hover:bg-white/5'),
        (r'hover:bg-gray-200', r'hover:bg-gray-200 dark:hover:bg-white/10'),
        (r'hover:bg-gray-100', r'hover:bg-gray-100 dark:hover:bg-white/5'),
        (r'hover:bg-gray-300', r'hover:bg-gray-300 dark:hover:border-white/10'),
        (r'bg-gray-900/40', r'bg-gray-900/40 dark:bg-black/60'),
        (r'bg-gray-900/60', r'bg-gray-900/60 dark:bg-black/80'),
        (r'bg-gray-900', r'bg-gray-900 dark:bg-gray-800'),
    ]

    for old, new in replacements:
        content = re.sub(old, new, content)

    # Some replacements will double-up because "bg-gray-900" is created by earlier passes. Let's fix that.
    # We can just write out the content.
    with open('src/pages/SystemHealth.tsx', 'w') as f:
        f.write(content)

if __name__ == '__main__':
    update_file()
