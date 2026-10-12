sed -i "s/family=Sora:wght@100;200;300;400;500;600;700;800&family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800/family=Fira+Code:wght@300;400;500;600;700/g" src/index.css
sed -i "s/--font-body: \"Sora\"/--font-body: \"Space Grotesk\"/g" src/index.css
sed -i "s/--font-mono: \"JetBrains Mono\"/--font-mono: \"Fira Code\"/g" src/index.css

sed -i "s/--color-depth-space: #05010A/--color-depth-space: #06018A/g" src/index.css
sed -i "s/--color-depth-nebula: #090312/--color-depth-nebula: #0C0412/g" src/index.css
sed -i "s/--color-pulse-primary: var(--pulse-primary, #7B4DFF)/--color-pulse-primary: var(--pulse-primary, #7840FF)/g" src/index.css

sed -i "s/--pulse-primary: #7B4DFF/--pulse-primary: #7840FF/g" src/index.css
sed -i "s/--bg-dark-space: #05010A/--bg-dark-space: #06018A/g" src/index.css
sed -i "s/--surface-layer-1: #090312/--surface-layer-1: #0C0412/g" src/index.css
sed -i "s/--text-pure: #ffffff/--text-pure: #F8F4FF/g" src/index.css
sed -i "s/--text-primary: #f5f5f7/--text-primary: #F8F4FF/g" src/index.css

sed -i "s/background-color: #05010A/background-color: #06018A/g" src/index.css
sed -i "s/color: #f5f5f7/color: #F8F4FF/g" src/index.css

sed -i "s/.bg-depth-space { background-color: #05010A !important; }/.bg-depth-space { background-color: #06018A !important; }/g" src/index.css
sed -i "s/.bg-depth-nebula { background-color: #090312 !important; }/.bg-depth-nebula { background-color: #0C0412 !important; }/g" src/index.css
