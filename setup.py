from setuptools import setup

setup(
    name="ghitty",
    version="0.1.0",
    description="Recall-first GitHub repository discovery with metadata and code evidence",
    py_modules=["repo_finder"],
    python_requires=">=3.9",
    install_requires=["openai==2.48.0"],
    entry_points={"console_scripts": ["ghitty=repo_finder:main"]},
)
