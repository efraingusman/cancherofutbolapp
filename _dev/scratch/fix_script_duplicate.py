import re

filepath = r"c:\Users\Cliente\Documents\canchero app\script.js"

with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Define the pattern to find the second openGlobalDirectory (we know it's after checkPremiumStatus)
# Let's locate the duplicate openGlobalDirectory definition and remove it.
# It starts with window.openGlobalDirectory = function(type) { and ends with } and navigate('club'); \n } \n }

pattern = r"(window\.openGlobalDirectory = function\(type\) \{\s+if \(!userData\) \{[\s\S]+?\}\s+\}\s+else \{\s+navigate\('club'\);\s+\}\s+\})"
match = re.search(pattern, content)
if match:
    print("Found duplicate openGlobalDirectory!")
    content = content.replace(match.group(1), "")
else:
    # Try a simpler regex that matches after checkPremiumStatus
    pattern_alt = r"(window\.checkPremiumStatus = function\(\) \{[\s\S]+?\}\s*\n+)(window\.openGlobalDirectory = function\(type\) \{[\s\S]+?\}\s*\n+)(let currentCoverBase64)"
    match_alt = re.search(pattern_alt, content)
    if match_alt:
        print("Found duplicate openGlobalDirectory using alt pattern!")
        content = content.replace(match_alt.group(2), "")
    else:
        print("Could not find duplicate openGlobalDirectory with regex!")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
