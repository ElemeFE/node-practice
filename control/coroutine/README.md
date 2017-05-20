# Coroutine 的简单实现

## Index

* [介绍](#intro)
* [例子](#example)
* [头文件](#头文件)
* [阅读顺序](#阅读顺序)
* [代码](#code)

## Intro

本来想上 Babel 的实现, 但是感觉 C 的代码比 Js 看起来要清晰 (还是只有我自己这么觉得???)

源代码仓库: https://github.com/Lellansin/coroutine

PS: 仅 Unix/linux 和 win

## Example

```c
#include "coroutine.h"
#include <stdio.h>

// 传递参数的结构体
struct args {
	int n;
};

// 协程的 callback
static void
foo(struct schedule * S, void *ud) {
	struct args * arg = ud;
	int start = arg->n; // 获取到当前协程执行参数
	int i;
	for (i=0;i<5;i++) {
		printf("coroutine %d : %d\n",coroutine_running(S) , start + i);
		// yield 中断当前协程，将执行权限还给 schedule
		coroutine_yield(S);
	}
}

// 3. 测试内容 (上下文属于 schedule)
static void
test(struct schedule *S) {
	struct args arg1 = { 0 }; // 协程1 的参数
	struct args arg2 = { 100 }; // 协程2 的参数

	int co1 = coroutine_new(S, foo, &arg1); // 3.1 创建协程1 指定 cb 传入参数 0
	int co2 = coroutine_new(S, foo, &arg2); // 3.2 创建协程2 指定 cb 传入参数 100
	printf("main start\n");
	while (coroutine_status(S,co1) && coroutine_status(S,co2)) { // 如果协程 1、2 未结束
		coroutine_resume(S,co1); // resume 协程1 执行 cb
		coroutine_resume(S,co2); // resume 协程2 执行 cb
	} 
	printf("main end\n");
}

// 1. 主逻辑
int 
main() {
	// 2. 创建一个管理协程的 schedule
	struct schedule * S = coroutine_open();
	// 3. 主要测试代码
	test(S);
	//  回收 schedule
	coroutine_close(S);
	return 0;
}
```

## 头文件

`coroutine.h`

```c
#ifndef C_COROUTINE_H
#define C_COROUTINE_H

#define COROUTINE_DEAD 0
#define COROUTINE_READY 1
#define COROUTINE_RUNNING 2
#define COROUTINE_SUSPEND 3

struct schedule;

typedef void (*coroutine_func)(struct schedule *, void *ud);

struct schedule * coroutine_open(void);
void coroutine_close(struct schedule *);

int coroutine_new(struct schedule *, coroutine_func, void *ud);
void coroutine_resume(struct schedule *, int id);
int coroutine_status(struct schedule *, int id);
int coroutine_running(struct schedule *);
void coroutine_yield(struct schedule *);

#endif
```

## 阅读顺序

具体实现 (请按顺序阅读)

注：注释中协程均以 co 为简写

1. 初始化管理协程的 schedule
2. co 结构体初始化
3. co 状态检查
4.1 resume 
4.2 ready 状态的 resume（新鲜的刚 new 的 co
  6. suspend 状态的 resume
5. 实现 yield 让出上下文

## Code

```c
#include "coroutine.h"
#include <stdio.h>
#include <stdlib.h>
#include <ucontext.h>
#include <assert.h>
#include <stddef.h>
#include <string.h>
#include <stdint.h>

#define STACK_SIZE (1024*1024)
#define DEFAULT_COROUTINE 16

struct coroutine;

struct schedule {
	char stack[STACK_SIZE];
	ucontext_t main;
	int nco;
	int cap;
	int running;
	struct coroutine **co;
};

struct coroutine {
	coroutine_func func;
	void *ud;
	ucontext_t ctx;
	struct schedule * sch;
	ptrdiff_t cap;
	ptrdiff_t size;
	int status;
	char *stack;
};

struct coroutine * 
_co_new(struct schedule *S , coroutine_func func, void *ud) {
	struct coroutine * co = malloc(sizeof(*co));
	co->func = func;
	co->ud = ud; // 主流程传递给当前 co 的参数
	co->sch = S;
	co->cap = 0;
	co->size = 0;
	co->status = COROUTINE_READY;
	co->stack = NULL;
	return co;
}

void
_co_delete(struct coroutine *co) {
	free(co->stack); // 释放 stack 内存
	free(co); // 释放 co 结构体内存
}

// 1. 创建一个管理协程的 schedule
struct schedule * 
coroutine_open(void) {
	struct schedule *S = malloc(sizeof(*S)); // 申请内存
	S->nco = 0; // 当前管理 co 数目
	S->cap = DEFAULT_COROUTINE; // 当前管理 co 数目上限
	S->running = -1; // 当前是否有 co 在运行
	S->co = malloc(sizeof(struct coroutine *) * S->cap); // 申请一个默认的co内存
	memset(S->co, 0, sizeof(struct coroutine *) * S->cap); // 清空这个内存
	return S; // 返回当前 schedule 指针
}

void 
coroutine_close(struct schedule *S) {
	int i;
	for (i=0;i<S->cap;i++) {
		struct coroutine * co = S->co[i];
		if (co) {
			_co_delete(co);
		}
	}
	free(S->co);
	S->co = NULL;
	free(S);
}

// 2. 创建一个新的 co
int 
coroutine_new(struct schedule *S, coroutine_func func, void *ud) {
	// 初始化 co 的结构体内存
	struct coroutine *co = _co_new(S, func , ud);
	if (S->nco >= S->cap) { // 如果当前 schedule 管理的 co 数目达到管理承载数
		// 则将承载翻倍
		int id = S->cap;
		// 内存翻倍
		S->co = realloc(S->co, S->cap * 2 * sizeof(struct coroutine *));
		memset(S->co + S->cap , 0 , sizeof(struct coroutine *) * S->cap);
		S->co[S->cap] = co;
		S->cap *= 2; // 上限乘以2
		++S->nco; 
		return id;
	} else {
		// 如果还在承载范围内
		int i;
		for (i=0;i<S->cap;i++) { // 从0开始往上找
			int id = (i+S->nco) % S->cap;
			if (S->co[id] == NULL) { // 找到个没被用的坑
				S->co[id] = co; // 就决定是你了
				++S->nco; // 当前管理数 ++
				return id; // 返回这个坑的 id
			}
		}
	}
	assert(0); // 报错 (相当于 throw error)
	return -1;
}

static void
mainfunc(uint32_t low32, uint32_t hi32) {
	uintptr_t ptr = (uintptr_t)low32 | ((uintptr_t)hi32 << 32);
	struct schedule *S = (struct schedule *)ptr;
	int id = S->running;
	struct coroutine *C = S->co[id];
	C->func(S,C->ud);
	_co_delete(C);
	S->co[id] = NULL;
	--S->nco;
	S->running = -1;
}

// 4. resume 一个 co
void 
coroutine_resume(struct schedule * S, int id) {
	assert(S->running == -1); // 判断 schdule 是不是 close 了
	assert(id >=0 && id < S->cap); // 判断 id 是否 valid
	struct coroutine *C = S->co[id]; // 获取 co
	if (C == NULL) // 检查 co 是否 dead
		return;
	int status = C->status; // 获取 co 状态
	switch(status) {
	// 4.1 ready 状态（新鲜的刚 new 的 co
	case COROUTINE_READY:
		// 获取该 co 上线文
		getcontext(&C->ctx);
		// 设置上下文
		C->ctx.uc_stack.ss_sp = S->stack;
		C->ctx.uc_stack.ss_size = STACK_SIZE;
		C->ctx.uc_link = &S->main;
		// schedule 当前跑这个 co
		S->running = id;
		// 设置当前 co 状态为运行中
		C->status = COROUTINE_RUNNING;
		uintptr_t ptr = (uintptr_t)S; // 强行留一个 schedule 的指针
		// 创建当前 co 的上线文
		makecontext(&C->ctx, (void (*)(void)) mainfunc, 2, (uint32_t)ptr, (uint32_t)(ptr>>32)); // ptr >> 32 用于兼容32位和64位系统 magic ;)
		// 把当前 schedule 的上下文（就是 main.c 里面跑的 test 那个函数的上下文）跟 co 的上下文（就是去跑当前 co 的 cb）切换
		swapcontext(&S->main, &C->ctx);
		break;
	// 6. 从 suspend 状态 resume 一个 co
	case COROUTINE_SUSPEND:
		// 先将当前 co 的 stack 拷贝回 schedule 公用的 stack
		memcpy(S->stack + STACK_SIZE - C->size, C->stack, C->size);
		S->running = id; // 设置当前 schedule 运行的 co 的 id
		C->status = COROUTINE_RUNNING; // 设置当前 co 状态为运行
		swapcontext(&S->main, &C->ctx); // 将主流程的上下文与该 co 的上下文交换
		break;
	default:
		assert(0);
	}
}

static void
_save_stack(struct coroutine *C, char *top) {
	char dummy = 0;
	assert(top - &dummy <= STACK_SIZE);
	if (C->cap < top - &dummy) {
		free(C->stack);
		C->cap = top-&dummy;
		C->stack = malloc(C->cap);
	}
	C->size = top - &dummy;
	memcpy(C->stack, &dummy, C->size);
}

// 5. yield 让出上下文
void
coroutine_yield(struct schedule * S) {
	// 通过 schedule 得到当前运行的 co 的 id
	int id = S->running;
	assert(id >= 0);
	// 通过 schedule 获取 co 对象
	struct coroutine * C = S->co[id];
	assert((char *)&C > S->stack); // 判断该 co 的栈是否合法
	_save_stack(C,S->stack + STACK_SIZE); // 保存当前 co 的栈
	C->status = COROUTINE_SUSPEND; // 将 co 状态设置为 suspend
	S->running = -1; // 设置 schedule 状态为未运行
	swapcontext(&C->ctx , &S->main); // 交换 co 与 schedule 的上下文（回到 main.c 中的 test 函数）
}

// 3. 检查当前 co 状态
int 
coroutine_status(struct schedule * S, int id) {
	// 如果你问的这个 co 的 id 不在正常范围就抛错
	assert(id>=0 && id < S->cap);
	if (S->co[id] == NULL) { // 如果这个 co 的内存已释放
		return COROUTINE_DEAD; // 这个 co 已死了
	}
	return S->co[id]->status; // 通过 schedule 找到 co 返回它的状态
}

int 
coroutine_running(struct schedule * S) {
	return S->running;
}

```
